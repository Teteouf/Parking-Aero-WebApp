'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const publicDir = path.join(__dirname, '../public');
const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'manifest.webmanifest'), 'utf8'));
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

function checkPng(asset, size) {
  const image = fs.readFileSync(path.join(publicDir, asset));
  assert.equal(image.subarray(1, 4).toString(), 'PNG', asset);
  assert.equal(image.readUInt32BE(16), size, asset + ' width');
  assert.equal(image.readUInt32BE(20), size, asset + ' height');
  assert.equal(image[25], 2, asset + ' must have an opaque RGB background');
}

test('installation has distinct standard and adaptive icons with truthful sizes and opaque backgrounds', () => {
  for (const purpose of ['any', 'maskable']) for (const size of [192, 512]) {
    const icon = manifest.icons.find(item => item.purpose === purpose && item.sizes === `${size}x${size}`);
    assert(icon, `${purpose} ${size}`);
    assert.equal(icon.type, 'image/png');
    assert(!icon.src.startsWith('/'), 'icon URLs must work in the GitHub Pages subfolder');
    checkPng(icon.src, size);
  }
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.short_name, 'CDG Parking');
});

test('iPhone and iPad choose matching Apple touch sizes rather than a screenshot of the page', () => {
  const links = [...html.matchAll(/<link\b[^>]*rel="apple-touch-icon"[^>]*>/g)].map(match => match[0]);
  for (const size of [152, 167, 180]) {
    const link = links.find(item => item.includes(`sizes="${size}x${size}"`));
    assert(link, `Apple touch ${size}`);
    checkPng(link.match(/href="([^"]+)"/)[1], size);
  }
  assert(html.includes('name="apple-mobile-web-app-title" content="CDG Parking"'));
});

test('all installation icons are included in the offline bundle', () => {
  const worker = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8');
  const assets = new Set([...manifest.icons.map(icon => icon.src), ...[...html.matchAll(/<link\b[^>]*rel="(?:apple-touch-icon|icon)"[^>]*>/g)].map(match => match[0].match(/href="([^"]+)"/)[1])]);
  for (const asset of assets) assert(worker.includes(JSON.stringify(asset)), asset);
  const ico = fs.readFileSync(path.join(publicDir, 'assets/favicon-v2.ico'));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  assert.deepEqual([ico[6], ico[22], ico[38]], [16, 32, 48]);
});
