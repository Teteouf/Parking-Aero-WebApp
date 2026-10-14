'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('../src/server');

test('the local server exposes the app with correct MIME types, never server sources or the removed API', async t => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const html = await fetch(base);
  assert.equal(html.status, 200);
  assert.match(html.headers.get('content-type'), /text\/html/);
  assert((await html.text()).includes('Parkings & portes'));
  for (const name of ['/server.js', '/src/server.js', '/package.json', '/api/gate?flight=AF7434']) assert.equal((await fetch(base + name)).status, 404, name);
  assert.equal((await fetch(base + '/%2e%2e%2fpackage.json')).status, 400);
  assert.equal((await fetch(base + '/%ZZ')).status, 400);
  assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
  const worker = await fetch(base + '/sw.js');
  assert.match(worker.headers.get('content-type'), /javascript/);
  assert.equal(worker.headers.get('cache-control'), 'no-cache');
  const data = await fetch(base + '/data/iata.json');
  assert.equal(data.status, 200);
  assert((await data.json()).locations.length > 9000);
  const manifest = await fetch(base + '/manifest.webmanifest');
  assert.match(manifest.headers.get('content-type'), /application\/manifest\+json/);
});

test('the Pages path serves the complete public artifact and keeps relative URLs within /Parking-Aero-WebApp/', async t => {
  const basePath = '/Parking-Aero-WebApp/';
  const server = createServer({ basePath });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const base = origin + basePath;
  const redirect = await fetch(origin + '/Parking-Aero-WebApp?from=qr', { redirect: 'manual' });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), basePath + '?from=qr');
  const html = await (await fetch(base)).text();
  assert.match(html, /id="searchInput"/);
  assert.match(html, /Parkings & portes/);
  assert.doesNotMatch(html, /Démarrer et vérifier/);
  const publicDir = path.join(__dirname, '../public');
  const files = fs.readdirSync(publicDir, { recursive: true }).filter(name => fs.statSync(path.join(publicDir, name)).isFile());
  for (const name of files) {
    const response = await fetch(new URL(name.split(path.sep).join('/'), base));
    assert.equal(response.status, 200, name);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), fs.readFileSync(path.join(publicDir, name)), name);
  }
  for (const [, resource] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = new URL(resource, base);
    assert(url.pathname.startsWith(basePath), resource);
    assert.equal((await fetch(url)).status, 200, resource);
  }
  const worker = await fetch(new URL('sw.js', base));
  assert.match(worker.headers.get('content-type'), /javascript/);
  assert.equal(worker.headers.get('cache-control'), 'no-cache');
  const manifestResponse = await fetch(new URL('manifest.webmanifest', base));
  assert.match(manifestResponse.headers.get('content-type'), /application\/manifest\+json/);
  const manifest = await manifestResponse.json();
  for (const key of ['id', 'start_url', 'scope']) assert.equal(new URL(manifest[key], base).pathname, basePath, key);
  for (const icon of manifest.icons) {
    const url = new URL(icon.src, base);
    assert(url.pathname.startsWith(basePath));
    assert.equal((await fetch(url)).status, 200);
  }
  const head = await fetch(new URL('index.html', base), { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  for (const name of ['/', '/js/app.js', '/Parking-Aero-WebApp-other/', '/Parking-Aero-WebApp/public/index.html',
    '/Parking-Aero-WebApp/README.md', '/Parking-Aero-WebApp/src/server.js', '/Parking-Aero-WebApp/package.json',
    '/Parking-Aero-WebApp/%2e%2e%2fpackage.json']) {
    assert.equal((await fetch(origin + name)).status, name.includes('%2e') ? 400 : 404, name);
  }
});

test('invalid preview base paths fail before starting the server', () => {
  for (const basePath of ['Parking-Aero-WebApp/', '/Parking-Aero-WebApp', '//', '/../', '/app/?query', '/app/#hash']) {
    assert.throws(() => createServer({ basePath }), /BASE_PATH/);
  }
});
