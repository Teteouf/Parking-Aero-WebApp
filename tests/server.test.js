'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
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
