'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const workerTemplate = fs.readFileSync(path.join(root, 'src', 'service-worker.js'), 'utf8');

function collect(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const relative = prefix + entry.name;
    return entry.isDirectory() ? collect(path.join(dir, entry.name), relative + '/') : [relative];
  });
}
const assets = collect(publicDir).filter(file => file !== 'sw.js' && !file.endsWith('.tmp')).sort();
for (const required of ['index.html', 'js/theme.js', 'js/app.js', 'js/core.js', 'js/preferences.js', 'js/mappings.js', 'assets/qr-cdg-parking.png', 'data/iata.json', 'manifest.webmanifest']) {
  if (!assets.includes(required)) throw new Error(`Missing offline asset: ${required}`);
}
const hash = crypto.createHash('sha256').update(workerTemplate);
for (const asset of assets) hash.update(asset).update(fs.readFileSync(path.join(publicDir, asset)));
const version = hash.digest('hex').slice(0, 16);
const worker = workerTemplate.replace('__CACHE_VERSION__', version).replace('__PRECACHE_ASSETS__', JSON.stringify(assets, null, 2));
fs.writeFileSync(path.join(publicDir, 'sw.js'), worker);
console.log(`Offline version ${version}: ${assets.length} files, including the full local IATA directory.`);
