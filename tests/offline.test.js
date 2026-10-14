'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const publicDir = path.join(__dirname, '../public');
const source = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8');

function worker(scope = 'https://example.test/agents/') {
  const listeners = {};
  const stored = new Map();
  let networkCalls = 0;
  let claimed = false;
  let skipRequested = false;
  const cache = {
    async addAll(requests) {
      for (const request of requests) {
        const relative = new URL(request.url).pathname.replace(new URL(scope).pathname, '');
        stored.set(request.url, new Response(fs.readFileSync(path.join(publicDir, relative))));
      }
    },
    async match(key) { return stored.get(typeof key === 'string' ? key : key.url); },
  };
  const deleted = [];
  vm.runInNewContext(source, {
    URL, Request,
    self: { registration: { scope }, clients: { async claim() { claimed = true; } },
      addEventListener(type, listener) { listeners[type] = listener; }, skipWaiting() { skipRequested = true; } },
    caches: { async open() { return cache; }, async keys() { return ['cdg-parking:/agents/:old', 'another-app']; }, async delete(name) { deleted.push(name); } },
    async fetch() { networkCalls++; throw new Error('Network unavailable'); },
  });
  return { listeners, stored, deleted, get networkCalls() { return networkCalls; }, get claimed() { return claimed; }, get skipRequested() { return skipRequested; } };
}

test('the first installation records all startup files and the entire IATA snapshot', async () => {
  const instance = worker();
  let installation;
  instance.listeners.install({ waitUntil(promise) { installation = promise; } });
  await installation;
  for (const asset of ['index.html', 'css/app.css', 'js/theme.js', 'js/app.js', 'js/core.js', 'js/preferences.js', 'js/mappings.js', 'assets/qr-cdg-parking.png', 'data/iata.json', 'manifest.webmanifest']) {
    assert(instance.stored.has('https://example.test/agents/' + asset), asset);
  }
});

test('a cold navigation and IATA lookup work with a failing network, including a subfolder deployment', async () => {
  const instance = worker();
  let installation;
  instance.listeners.install({ waitUntil(promise) { installation = promise; } });
  await installation;
  let navigation;
  instance.listeners.fetch({ request: { method: 'GET', url: 'https://example.test/agents/', mode: 'navigate' }, respondWith(promise) { navigation = promise; } });
  assert((await (await navigation).clone().text()).includes('CDG Parking'));
  let directory;
  instance.listeners.fetch({ request: new Request('https://example.test/agents/data/iata.json'), respondWith(promise) { directory = promise; } });
  assert((await (await directory).clone().json()).locations.length > 9000);
  assert.equal(instance.networkCalls, 0);
});

test('activation cleans only this app scope and updates require an explicit message', async () => {
  const instance = worker();
  let activation;
  instance.listeners.activate({ waitUntil(promise) { activation = promise; } });
  await activation;
  assert.deepEqual(instance.deleted, ['cdg-parking:/agents/:old']);
  assert(instance.claimed);
  assert.equal(instance.skipRequested, false);
  instance.listeners.message({ data: { type: 'SKIP_WAITING' } });
  assert(instance.skipRequested);
});
