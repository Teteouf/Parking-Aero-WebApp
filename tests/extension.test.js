'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = require('../public/js/extension-data');
const extension = require('../public/js/extension');
const { searchParking } = require('../public/js/core');

const docs = path.join(__dirname, '../docs/extension-cdg/terminaux/donnees');
const read = name => JSON.parse(fs.readFileSync(path.join(docs, name), 'utf8'));
const eaipStands = read('postes-eaip-ad2-8.json').postes;
const planGates = read('portes-plan-paris-aeroport.json').portes;
const catalog = extension.createCatalog(data);

// Décompte attendu par terminal intégré : postes face au bâtiment, postes de rattachement
// incertain, portes du plan, relations étayées.
const EXPECTED = {
  '2A': { certain: 8, uncertain: 10, gates: 14, relations: 0 },
  '2B': { certain: 13, uncertain: 8, gates: 17, relations: 0 },
  '2C': { certain: 10, uncertain: 4, gates: 12, relations: 0 },
  '2D': { certain: 9, uncertain: 11, gates: 17, relations: 0 },
};

function mappings() {
  const sandbox = { window: {} };
  require('node:vm').runInNewContext(fs.readFileSync(path.join(__dirname, '../public/js/mappings.js'), 'utf8'), sandbox);
  return JSON.parse(JSON.stringify(sandbox.window.PARKING_MAPPINGS));
}

test('the generated data file is up to date with the sourced inventories', () => {
  const before = fs.readFileSync(path.join(__dirname, '../public/js/extension-data.js'), 'utf8');
  require('node:child_process').execFileSync(process.execPath, [path.join(__dirname, '../scripts/build-extension-data.js')]);
  assert.equal(fs.readFileSync(path.join(__dirname, '../public/js/extension-data.js'), 'utf8'), before);
});

test('every included terminal matches its expected inventory', () => {
  assert(data.terminalsIncluded.length >= 1);
  for (const terminal of data.terminalsIncluded) {
    const stands = catalog.stands.filter(stand => stand.sector === terminal);
    const expected = EXPECTED[terminal];
    assert.equal(stands.filter(stand => stand.certain).length, expected.certain, `${terminal} certain`);
    assert.equal(stands.filter(stand => !stand.certain).length, expected.uncertain, `${terminal} uncertain`);
    assert.equal(catalog.gates.filter(gate => gate.terminal === terminal).length, expected.gates, `${terminal} gates`);
    assert.equal(stands.reduce((sum, stand) => sum + stand.relations.length, 0), expected.relations, `${terminal} relations`);
  }
});

test('nothing is invented: every stand comes from the eAIP table and every gate from the plan', () => {
  for (const stand of data.stands) {
    const source = eaipStands.find(item => item.code === stand.code);
    assert(source, stand.code);
    assert.equal(stand.ins, `${source.lat_dms} ${source.lon_dms}`);
  }
  for (const gate of data.gates) assert(planGates.some(item => item.code === gate.code && item.terminal === gate.terminal), gate.code);
});

test('no duplicates in stands or gates', () => {
  for (const list of [catalog.stands, catalog.gates]) {
    const codes = list.map(item => item.code);
    assert.equal(new Set(codes).size, codes.length);
  }
});

test('stands and gates stay distinct when their codes are identical', () => {
  const sameCode = catalog.stands.map(stand => stand.code).filter(code => catalog.gates.some(gate => gate.code === code));
  for (const code of sameCode) {
    const result = extension.search(catalog, code);
    assert.deepEqual(result.stands.map(item => item.type), ['stand']);
    assert.deepEqual(result.gates.map(item => item.type), ['gate']);
  }
});

test('without a sourced relation, no gate is attached to a stand and no stand to a gate', () => {
  for (const stand of catalog.stands) if (!stand.relations.length) assert.equal(stand.type, 'stand');
  assert(catalog.stands.every(stand => stand.relations.every(relation => relation.proof)));
});

test('the terminal of a gate comes from its source, not from its first letter', () => {
  if (!data.terminalsIncluded.includes('2B')) return;
  for (const code of ['D40', 'D41']) assert.equal(extension.find(catalog, 'gate', code).terminal, '2B');
  assert.deepEqual(extension.search(catalog, 'D40', '2D').gates, []);
});

test('an uncertain attachment stays uncertain', () => {
  for (const stand of catalog.stands.filter(item => !item.certain)) {
    assert.equal(stand.terminal, null);
    assert.match(extension.terminalText(stand), /Terminal non établi · secteur 2[A-D]/);
    assert.match(stand.basis, /non établi/);
  }
});

test('search uses the same normalization as the mappings and respects filters', () => {
  const [first] = catalog.stands;
  const spaced = first.code.replace(/^([A-Z]+)0*(\d+)$/, '$1 $2');
  assert.deepEqual(extension.search(catalog, spaced).stands.map(item => item.code), [first.code]);
  assert.deepEqual(extension.search(catalog, first.code, '2E'), { stands: [], gates: [] });
  assert.deepEqual(extension.search(catalog, ''), { stands: [], gates: [] });
  for (const terminal of data.terminalsIncluded) {
    const all = extension.search(catalog, '', terminal);
    assert(all.stands.length + all.gates.length > 0);
    assert(all.stands.every(item => item.sector === terminal) && all.gates.every(item => item.sector === terminal));
  }
});

test('the 169 mappings and their searches are unchanged by the extension', () => {
  const list = mappings();
  assert.equal(list.length, 169);
  assert.deepEqual(searchParking(list, 'E22').map(m => m.gates), [['K43']]);
  assert.deepEqual(searchParking(list, 'K43').map(m => m.parkingCode), ['E22']);
  for (const stand of catalog.stands) assert(!list.some(m => m.parkingCode === stand.code), stand.code);
});

test('a sourced relation would be shown with its provenance', () => {
  const fixture = { terminalsIncluded: ['2A'], consulted: 'test', sources: { S9: { label: 'Source test', date: '2026' } },
    stands: [{ code: 'A10', terminal: '2A', sector: '2A', position: 'face-batiment', ins: '', basis: '', note: '', sources: ['S9'],
      relations: [{ stand: 'A10', gates: ['A44'], proof: 'Source test, page 1', conditions: 'vols Schengen' }] }],
    gates: [] };
  const [stand] = extension.createCatalog(fixture).stands;
  assert.deepEqual(stand.relations[0].gates, ['A44']);
  assert.equal(stand.relations[0].proof, 'Source test, page 1');
});
