const { getDb } = require('./db');

function list() {
  return getDb().prepare('SELECT * FROM products ORDER BY name ASC').all();
}

function search(query) {
  const like = `%${query}%`;
  return getDb()
    .prepare('SELECT * FROM products WHERE name LIKE ? OR barcode = ? ORDER BY name ASC')
    .all(like, query);
}

function add({ barcode, name, price }) {
  if (!name || typeof price !== 'number') throw new Error('name and price required');
  const stmt = getDb().prepare(
    'INSERT INTO products (barcode, name, price) VALUES (?, ?, ?)'
  );
  const result = stmt.run(barcode || null, name.trim(), price);
  return getDb().prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
}

function update(id, { name, price, barcode }) {
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
  if (price !== undefined) { fields.push('price = ?'); values.push(price); }
  if (barcode !== undefined) { fields.push('barcode = ?'); values.push(barcode); }
  if (!fields.length) throw new Error('nothing to update');
  values.push(id);
  getDb().prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getDb().prepare('SELECT * FROM products WHERE id = ?').get(id);
}

function remove(id) {
  getDb().prepare('DELETE FROM products WHERE id = ?').run(id);
}

module.exports = { list, search, add, update, remove };
