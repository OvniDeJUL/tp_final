# Document de Conception — Caisse Épicerie

## 1. Contexte et objectifs

Application de caisse enregistreuse pour une épicerie de quartier. Remplace un registre papier et une vieille caisse. Contraintes : installable sur le poste du commerçant, fonctionnel sans connexion internet, simple d'utilisation.

---

## 2. Modèle de données

### Schéma SQLite (`caisse.sqlite`, stocké dans `app.getPath('userData')`)

```
┌──────────────┐       ┌──────────────┐       ┌────────────────────┐
│   products   │       │    sales     │       │    sale_items      │
├──────────────┤       ├──────────────┤       ├────────────────────┤
│ id (PK)      │◄──┐   │ id (PK)      │◄──┐   │ id (PK)            │
│ barcode TEXT │   │   │ total REAL   │   └───│ sale_id (FK)       │
│ name TEXT    │   └───│ created_at   │       │ product_id (FK)    │
│ price REAL   │       └──────────────┘       │ name TEXT          │
│ created_at   │                              │ price REAL         │
└──────────────┘                              │ quantity INTEGER   │
                                              └────────────────────┘
```

### Justifications

- **`sale_items.name` dénormalisé** : le nom du produit est copié au moment de la vente. Si le produit est supprimé ou renommé plus tard, l'historique des ventes reste cohérent et lisible.
- **`sale_items.product_id` nullable** : lien optionnel vers le catalogue. Une vente peut référencer un produit supprimé (`ON DELETE SET NULL`) sans perdre les données de la vente.
- **`sales.total` calculé et stocké** : évite de recalculer à chaque lecture de l'historique ; source de vérité pour les exports comptables.
- **Index sur `products.barcode`** et **`sales.created_at`** : accès rapide par code-barres et filtrage par date.

---

## 3. Architecture applicative

### Processus Electron

```
┌─────────────────────────────────────────────────────┐
│  Processus Main (main.js)                           │
│  ┌──────────────┐  ┌────────────┐  ┌─────────────┐ │
│  │ src/services │  │  src/ipc   │  │  Electron   │ │
│  │  db.js       │  │ products   │  │  APIs       │ │
│  │  products.js │  │ sales      │  │  (dialog,   │ │
│  │  sales.js    │  │ settings   │  │  notif,     │ │
│  │  openfood.js │  │            │  │  menu...)   │ │
│  └──────────────┘  └────────────┘  └─────────────┘ │
└────────────────────────┬────────────────────────────┘
                         │ IPC (invoke/handle)
                    ┌────┴────┐
                    │preload.js│  ← contextBridge
                    └────┬────┘
                         │ window.productsAPI / salesAPI / settingsAPI
┌────────────────────────┴────────────────────────────┐
│  Processus Renderer (src/renderer/)                  │
│  index.html · app.js · style.css · i18n.js          │
│  Pas d'accès Node.js direct (contextIsolation: true) │
└─────────────────────────────────────────────────────┘
```

### Flux d'une fonctionnalité (pattern du cours)

```
preload expose     →   main handle()   →   renderer await
window.salesAPI       ipcMain.handle       window.salesAPI
  .exportPDF()          ('sales:            .exportPDF(date)
                         export-pdf')
```

### Séparation des responsabilités

| Couche | Rôle | Dépendances Electron |
|--------|------|----------------------|
| `src/services/` | Logique métier pure (SQL, PDF, API) | Aucune |
| `src/ipc/` | Pont IPC + validation des entrées | `ipcMain`, `Notification` |
| `preload.js` | Passerelle sécurisée | `contextBridge`, `ipcRenderer` |
| `src/renderer/` | Interface utilisateur | Aucune (Node.js interdit) |

Les services sont **testables indépendamment** (pas d'import Electron). Les tests Jest mockent uniquement `./db`.

---

## 4. Choix techniques et justifications

### SQLite (`better-sqlite3`)
- Zéro infrastructure serveur : fonctionne comme un fichier local.
- Synchrone : simplifie le code dans le processus Main sans risque de blocage UI (le Main n'affiche rien).
- Transactions ACID : la validation d'une vente (insertion `sales` + `sale_items`) est atomique.
- **Alternative écartée** : `lowdb` (JSON) → pas de requêtes relationnelles, risque de corruption en cas de crash d'écriture.

### `electron-store` pour les préférences
- Stockage JSON simple pour deux clés (`lang`, `theme`).
- `better-sqlite3` aurait été surdimensionné pour cet usage.

### `pdfkit` pour le PDF
- Bibliothèque JavaScript pure : aucune compilation native, aucun binaire externe (Chromium, wkhtmltopdf).
- Génération côté Main process : accès direct au système de fichiers, dialogue natif de sauvegarde.
- **Alternative écartée** : `webContents.printToPDF()` → nécessite une fenêtre dédiée et le rendu HTML, plus complexe pour un simple rapport tabulaire.

### OpenFoodFacts (requête HTTPS native)
- Pas de dépendance `axios` ou `node-fetch` : `https.get` de Node.js suffit.
- Timeout 5 s + résolution `null` en cas d'erreur : l'application reste fonctionnelle hors-ligne.
- Les requêtes passent par le Main process (CSP `default-src 'self'` dans le renderer).

### `launch.js` (script de démarrage)
- Supprime `ELECTRON_RUN_AS_NODE` avant de spawner le binaire Electron.
- Cette variable d'environnement, si présente, force Electron en mode Node.js pur et rend `require('electron')` inaccessible dans le Main process.

---

## 5. Sécurité

- `contextIsolation: true`, `nodeIntegration: false` : le renderer n'a aucun accès Node.js direct.
- CSP stricte dans `index.html` : `default-src 'self'`.
- Validation des paramètres IPC (type, plage, regex date) avant tout appel service.
- Échappement HTML systématique (`esc()`) dans le renderer.
- Événements UI par délégation avec `data-*` attributes : pas d'injection de code dans les attributs `onclick`.
- Liens externes interceptés par `setWindowOpenHandler` (non applicable ici : aucun lien externe dans l'UI).

---

## 6. Persistance et offline

Toutes les données métier sont stockées dans `app.getPath('userData')/caisse.sqlite`. L'application démarre et fonctionne intégralement sans connexion réseau. OpenFoodFacts est utilisé uniquement lors de l'ajout manuel d'un produit, en complément optionnel. L'échec silencieux (`null`) est géré.
