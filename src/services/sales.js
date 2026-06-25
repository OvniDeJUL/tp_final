const { getDb } = require('./db');
const path = require('path');
const fs = require('fs');
const { dialog } = require('electron');
const PDFDocument = require('pdfkit');

function create(items) {
  // items: [{ product_id, name, price, quantity }]
  if (!items || !items.length) throw new Error('cart is empty');
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const db = getDb();
  const insertSale = db.prepare('INSERT INTO sales (total) VALUES (?)');
  const insertItem = db.prepare(
    'INSERT INTO sale_items (sale_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)'
  );

  const run = db.transaction(() => {
    const { lastInsertRowid: saleId } = insertSale.run(total);
    for (const item of items) {
      insertItem.run(saleId, item.product_id || null, item.name, item.price, item.quantity);
    }
    return saleId;
  });

  const saleId = run();
  return db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
}

function listByDate(date) {
  // date: 'YYYY-MM-DD' or null for today
  const d = date || new Date().toISOString().slice(0, 10);
  return getDb()
    .prepare("SELECT * FROM sales WHERE date(created_at) = ? ORDER BY created_at DESC")
    .all(d);
}

function getDetail(id) {
  const sale = getDb().prepare('SELECT * FROM sales WHERE id = ?').get(id);
  if (!sale) return null;
  const items = getDb().prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);
  return { ...sale, items };
}

async function exportCSV(date) {
  const d = date || new Date().toISOString().slice(0, 10);
  const sales = listByDate(d);
  const rows = ['id,total,date'];
  for (const s of sales) {
    const items = getDb().prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(s.id);
    rows.push(`${s.id},${s.total.toFixed(2)},${s.created_at}`);
    for (const i of items) {
      rows.push(`,,"  ${i.name} x${i.quantity} @ ${i.price.toFixed(2)}"`);
    }
  }

  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export CSV',
    defaultPath: `ventes_${d}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });

  if (canceled || !filePath) return { canceled: true };
  fs.writeFileSync(filePath, rows.join('\n'), 'utf8');
  return { filePath };
}

async function exportPDF(date) {
  const d = date || new Date().toISOString().slice(0, 10);
  const sales = listByDate(d);

  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export PDF',
    defaultPath: `ventes_${d}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { canceled: true };

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc.fontSize(20).text(`Rapport de ventes`, { align: 'center' });
  doc.fontSize(12).text(d, { align: 'center' });
  doc.moveDown(1.5);

  if (!sales.length) {
    doc.fontSize(12).text('Aucune vente ce jour.', { align: 'center' });
  } else {
    let grandTotal = 0;
    for (const s of sales) {
      const items = getDb().prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(s.id);
      const saleTotal = Number(s.total);
      grandTotal += saleTotal;

      // Sale header
      doc.fontSize(12).font('Helvetica-Bold')
        .text(`Vente #${s.id}`, { continued: true })
        .font('Helvetica')
        .text(`  ${s.created_at.slice(0, 16).replace('T', ' ')}`, { continued: true })
        .text(`  ${saleTotal.toFixed(2)} €`, { align: 'right' });

      // Items
      for (const i of items) {
        doc.fontSize(10)
          .text(
            `    ${i.name}  ×${i.quantity}  @  ${Number(i.price).toFixed(2)} €  =  ${(i.price * i.quantity).toFixed(2)} €`,
            { indent: 16 }
          );
      }
      doc.moveDown(0.6);
    }

    // Grand total line
    doc.moveDown(0.5)
      .moveTo(50, doc.y).lineTo(545, doc.y).stroke()
      .moveDown(0.5)
      .fontSize(14).font('Helvetica-Bold')
      .text(`Total journée : ${grandTotal.toFixed(2)} €`, { align: 'right' });
  }

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { filePath };
}

module.exports = { create, listByDate, getDetail, exportCSV, exportPDF };
