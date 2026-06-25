const https = require('https');

function lookupBarcode(barcode) {
  return new Promise((resolve, reject) => {
    const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`;
    https.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status !== 1) return resolve(null);
          const p = json.product;
          resolve({
            barcode,
            name: p.product_name || p.product_name_fr || '',
            brand: p.brands || '',
            image: p.image_front_small_url || '',
          });
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null))
      .on('timeout', function () { this.destroy(); resolve(null); });
  });
}

module.exports = { lookupBarcode };
