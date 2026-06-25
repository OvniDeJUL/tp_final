const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('productsAPI', {
  list: () => ipcRenderer.invoke('products:list'),
  search: (query) => ipcRenderer.invoke('products:search', query),
  add: (product) => ipcRenderer.invoke('products:add', product),
  update: (id, data) => ipcRenderer.invoke('products:update', id, data),
  remove: (id) => ipcRenderer.invoke('products:remove', id),
  lookupBarcode: (barcode) => ipcRenderer.invoke('products:lookup-barcode', barcode),
});

contextBridge.exposeInMainWorld('salesAPI', {
  create: (items) => ipcRenderer.invoke('sales:create', items),
  listByDate: (date) => ipcRenderer.invoke('sales:list-by-date', date),
  getDetail: (id) => ipcRenderer.invoke('sales:get-detail', id),
  exportCSV: (date) => ipcRenderer.invoke('sales:export-csv', date),
  exportPDF: (date) => ipcRenderer.invoke('sales:export-pdf', date),
});

contextBridge.exposeInMainWorld('settingsAPI', {
  get: (key) => ipcRenderer.invoke('settings:get', key),
  set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
});
