(function () {
const translations = {
  fr: {
    nav_catalog: 'Catalogue',
    nav_pos: 'Caisse',
    nav_history: 'Historique',
    nav_settings: 'Paramètres',
    app_title: 'Caisse Épicerie',
    search_placeholder: 'Rechercher...',
    add_product: 'Ajouter produit',
    barcode: 'Code-barres',
    name: 'Nom',
    price: 'Prix (€)',
    lookup: 'Rechercher OpenFoodFacts',
    save: 'Enregistrer',
    cancel: 'Annuler',
    edit: 'Modifier',
    delete: 'Supprimer',
    confirm_delete: 'Supprimer ce produit ?',
    add_to_cart: 'Ajouter',
    cart_title: 'Panier',
    cart_empty: 'Panier vide',
    validate_sale: 'Valider la vente',
    clear_cart: 'Vider',
    total: 'Total',
    no_products: 'Aucun produit',
    date_label: 'Date',
    export_csv: 'Exporter CSV',
    no_sales: 'Aucune vente',
    detail: 'Détail',
    lang_label: 'Langue',
    theme_label: 'Thème',
    light: 'Clair',
    dark: 'Sombre',
    qty: 'Qté',
    product_added: 'Produit ajouté',
    sale_done: 'Vente enregistrée',
    offline_notice: 'Hors ligne – recherche OpenFoodFacts indisponible',
    qty_label: 'Quantité',
    not_found_off: 'Produit non trouvé dans OpenFoodFacts',
    export_pdf: 'Exporter PDF',
  },
  en: {
    nav_catalog: 'Catalog',
    nav_pos: 'POS',
    nav_history: 'History',
    nav_settings: 'Settings',
    app_title: 'Grocery POS',
    search_placeholder: 'Search...',
    add_product: 'Add product',
    barcode: 'Barcode',
    name: 'Name',
    price: 'Price (€)',
    lookup: 'Search OpenFoodFacts',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    confirm_delete: 'Delete this product?',
    add_to_cart: 'Add',
    cart_title: 'Cart',
    cart_empty: 'Cart is empty',
    validate_sale: 'Validate sale',
    clear_cart: 'Clear',
    total: 'Total',
    no_products: 'No products',
    date_label: 'Date',
    export_csv: 'Export CSV',
    no_sales: 'No sales',
    detail: 'Detail',
    lang_label: 'Language',
    theme_label: 'Theme',
    light: 'Light',
    dark: 'Dark',
    qty: 'Qty',
    product_added: 'Product added',
    sale_done: 'Sale recorded',
    offline_notice: 'Offline – OpenFoodFacts search unavailable',
    qty_label: 'Quantity',
    not_found_off: 'Product not found in OpenFoodFacts',
    export_pdf: 'Export PDF',
  },
};

let currentLang = 'fr';

function setLang(lang) {
  currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

function t(key) {
  return (translations[currentLang] || translations.fr)[key] || key;
}

function getLang() { return currentLang; }

window.i18n = { t, setLang, getLang };
})();
