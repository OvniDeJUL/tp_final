const { app, BrowserWindow, Menu, Notification, ipcMain, shell } = require('electron');
const path = require('path');
const log = require('electron-log');
const Store = require('electron-store');

const store = new Store();

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

log.transports.file.level = 'info';
log.info('App starting');

let mainWindow;

function createWindow() {
  const bounds = store.get('windowBounds', { width: 1200, height: 800, x: undefined, y: undefined });

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Caisse Épicerie',
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', () => {
    store.set('windowBounds', mainWindow.getBounds());
  });

  buildMenu();
}

function buildMenu() {
  const lang = store.get('lang', 'fr');
  const t = lang === 'fr'
    ? { file: 'Fichier', quit: 'Quitter', view: 'Affichage', devtools: 'Outils de développement' }
    : { file: 'File', quit: 'Quit', view: 'View', devtools: 'Developer Tools' };

  const template = [
    {
      label: t.file,
      submenu: [
        { label: t.quit, accelerator: 'CmdOrCtrl+Q', role: 'quit' },
      ],
    },
    {
      label: t.view,
      submenu: [
        { label: t.devtools, accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() },
        { role: 'reload' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  // Register IPC handlers
  require('./src/ipc/products.ipc');
  require('./src/ipc/sales.ipc');
  require('./src/ipc/settings.ipc');

  createWindow();
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Expose store and log to IPC handlers
module.exports = { store, log, mainWindow: () => mainWindow, buildMenu };
