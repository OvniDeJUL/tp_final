const { ipcMain, Notification } = require('electron');
const products = require('../services/products');
const { lookupBarcode } = require('../services/openfoodfacts');
const log = require('electron-log');

ipcMain.handle('products:list', () => products.list());

ipcMain.handle('products:search', (_, query) => products.search(String(query).slice(0, 100)));

ipcMain.handle('products:add', (_, product) => {
  const { barcode, name, price } = product;
  if (typeof price !== 'number' || price < 0) throw new Error('invalid price');
  const p = products.add({ barcode, name, price });
  if (Notification.isSupported()) {
    new Notification({ title: 'Produit ajouté', body: p.name }).show();
  }
  return p;
});

ipcMain.handle('products:update', (_, id, data) => {
  if (data.price !== undefined && (typeof data.price !== 'number' || data.price < 0))
    throw new Error('invalid price');
  return products.update(Number(id), data);
});

ipcMain.handle('products:remove', (_, id) => {
  products.remove(Number(id));
  return { ok: true };
});

ipcMain.handle('products:lookup-barcode', async (_, barcode) => {
  try {
    return await lookupBarcode(String(barcode).slice(0, 50));
  } catch (e) {
    log.warn('barcode lookup failed', e.message);
    return null;
  }
});
