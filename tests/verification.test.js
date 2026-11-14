'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const verification = require('../public/js/verification');
const { searchParking } = require('../public/js/core');

const mappingsFile = path.join(__dirname, '../public/js/mappings.js');
function loadMappings() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(mappingsFile, 'utf8'), sandbox);
  return JSON.parse(JSON.stringify(sandbox.window.PARKING_MAPPINGS));
}
const mappings = loadMappings();
const VALIDATED = ['F21', 'F23', 'F24', 'F25', 'F41', 'F43', 'F44', 'F45', 'F46'];

test('the 169 mappings keep their exact values (metadata live in a separate file)', () => {
  assert.equal(mappings.length, 169);
  const digest = crypto.createHash('sha256').update(JSON.stringify(mappings)).digest('hex');
  // Empreinte des 169 correspondances au commit 13730e5 : toute modification doit être sourcée.
  assert.equal(digest, 'd10b54f20164f62027664a0262750ea5b8e91dfb696c5cc2bbfba615eb9aa2d7');
  for (const mapping of mappings) {
    assert.deepEqual(Object.keys(mapping).sort(), ['elevator', 'gates', 'offsite', 'parkingCode', 'ramp', 'section', 'terminal']);
  }
  assert(!fs.readFileSync(mappingsFile, 'utf8').includes('verification'));
});

test('exactly the nine mappings declared by the manager are shown as validated', () => {
  const validated = mappings.filter(m => verification.verificationFor(m).status.id === 'validee-responsable');
  assert.deepEqual(validated.map(m => m.parkingCode).sort(), VALIDATED);
  for (const mapping of validated) assert.deepEqual(mapping.gates, [mapping.parkingCode]);
  assert.equal(verification.STATUS.managerValidated.label, 'Validée par le responsable');
  // Déclaration, pas une observation terrain datée.
  assert(!('date' in verification.STATUS.managerValidated));
  assert.match(verification.STATUS.managerValidated.detail, /pas une observation terrain datée/);
});

test('other mappings are "to document", never presented as wrong', () => {
  const others = mappings.filter(m => !VALIDATED.includes(m.parkingCode));
  assert.equal(others.length, 160);
  for (const mapping of others) assert.equal(verification.verificationFor(mapping).status.id, 'a-documenter');
  const { label, detail } = verification.STATUS.toDocument;
  assert.equal(label, 'Vérification à documenter');
  assert.match(detail, /ne signifie pas qu’elle est erronée/);
  assert.doesNotMatch(label, /erron|faux|fausse|invalide/i);
});

test('a declaration no longer applies if the mapping it covers changes', () => {
  const changed = { ...mappings.find(m => m.parkingCode === 'F21'), gates: ['F22'] };
  assert.equal(verification.verificationFor(changed).status.id, 'a-documenter');
});

test('verification state and usage conditions are separate axes', () => {
  const result = verification.verificationFor(mappings.find(m => m.parkingCode === 'F21'));
  assert.equal(result.status.id, 'validee-responsable');
  assert.equal(result.usage.id, 'non-documentees');
});

test('B20, B24 and B26 are documented stands without any gate', () => {
  assert.deepEqual(verification.DOCUMENTED_STANDS.map(s => s.code), ['B20', 'B24', 'B26']);
  for (const stand of verification.DOCUMENTED_STANDS) {
    assert.equal(stand.gate, null);
    assert.equal(stand.gateLabel, 'Porte à confirmer');
    assert.equal(stand.kind, 'documented');
    assert(stand.sources.length >= 2);
    assert(!mappings.some(m => m.parkingCode === stand.code || m.gates.includes(stand.code)), stand.code + ' must not collide');
    assert.deepEqual(searchParking(mappings, stand.code), []);
  }
});

test('pilot stands stay available, without gates, until the extension covers their terminal', () => {
  assert.deepEqual(verification.PILOT_STANDS.map(s => s.code), ['B20', 'B24', 'B26']);
  for (const stand of verification.PILOT_STANDS) assert.equal(stand.gate, null);
});
