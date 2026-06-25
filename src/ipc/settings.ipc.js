const { ipcMain } = require('electron');
const Store = require('electron-store');
const { buildMenu } = require('../../main');

const store = new Store();
const ALLOWED_KEYS = ['lang', 'theme'];

ipcMain.handle('settings:get', (_, key) => {
  if (!ALLOWED_KEYS.includes(key)) throw new Error('unknown key');
  return store.get(key, key === 'lang' ? 'fr' : 'light');
});

ipcMain.handle('settings:set', (_, key, value) => {
  if (!ALLOWED_KEYS.includes(key)) throw new Error('unknown key');
  if (key === 'lang' && !['fr', 'en'].includes(value)) throw new Error('invalid lang');
  if (key === 'theme' && !['light', 'dark'].includes(value)) throw new Error('invalid theme');
  store.set(key, value);
  if (key === 'lang') buildMenu();
  return { ok: true };
});
