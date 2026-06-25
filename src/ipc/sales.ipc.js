const { ipcMain, Notification } = require('electron');
const sales = require('../services/sales');

const log = require('electron-log');

ipcMain.handle('sales:create', (_, items) => {
  for (const item of items) {
    if (!item.name || typeof item.price !== 'number' || item.price < 0) throw new Error('invalid item');
    item.quantity = Math.max(1, Math.floor(Number(item.quantity)));
  }
  const sale = sales.create(items);
  log.info('Sale created', sale.id, 'total', sale.total);
  if (Notification.isSupported()) {
    new Notification({ title: 'Vente enregistrée', body: `Total : ${sale.total.toFixed(2)} €` }).show();
  }
  return sale;
});

ipcMain.handle('sales:list-by-date', (_, date) => {
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('invalid date');
  return sales.listByDate(date || null);
});

ipcMain.handle('sales:get-detail', (_, id) => sales.getDetail(Number(id)));

ipcMain.handle('sales:export-csv', async (_, date) => {
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('invalid date');
  return sales.exportCSV(date || null);
});

ipcMain.handle('sales:export-pdf', async (_, date) => {
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('invalid date');
  return sales.exportPDF(date || null);
});
