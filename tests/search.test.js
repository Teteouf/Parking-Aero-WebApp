'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../public/js/core');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/js/mappings.js'), 'utf8'), sandbox);
const mappings = JSON.parse(JSON.stringify(sandbox.window.PARKING_MAPPINGS));

test('parking → gate and gate → parking use the preserved CDG data', () => {
  assert.deepEqual(core.searchParking(mappings, 'E22').map(m => m.gates), [['K43']]);
  assert.deepEqual(core.searchParking(mappings, 'K43').map(m => m.parkingCode), ['E22']);
  assert.deepEqual(core.searchParking(mappings, ' e-22 ').map(m => m.parkingCode), ['E22']);
  assert.deepEqual(core.searchParking(mappings, 'F3').map(m => m.parkingCode), ['F03']);
});

test('exact codes keep both directions when a code is ambiguous', () => {
  const matches = core.searchParking(mappings, 'F32');
  assert(matches.some(m => m.parkingCode === 'F32'));
  assert(matches.some(m => m.gates.includes('F32')));
  assert(matches.every(m => m.parkingCode === 'F32' || m.gates.includes('F32')));
});

test('terminal and access filters compose with the search', () => {
  assert(core.searchParking(mappings, '', '2E').every(m => m.terminal === '2E'));
  assert.equal(core.searchParking(mappings, 'K43', '2F').length, 0);
  const access = core.searchParking(mappings, '', 'access');
  assert(access.length > 0);
  assert(access.every(m => m.ramp || m.elevator));
  assert.equal(core.searchParking(mappings, '<script>').length, 0);
});

test('all original mappings have unique parking identifiers and complete details', () => {
  assert.equal(mappings.length, 169);
  assert.equal(new Set(mappings.map(m => m.parkingCode)).size, mappings.length);
  for (const mapping of mappings) {
    assert.match(mapping.parkingCode, /^[A-Z]\d{2}$/);
    assert(mapping.gates.length > 0);
    assert(mapping.gates.every(gate => /^[A-Z]\d{2}$/.test(gate)));
    assert(mapping.terminal && mapping.section);
    for (const field of ['ramp', 'elevator', 'offsite']) assert.equal(typeof mapping[field], 'boolean');
  }
});

const referenceLocations = core.prepareLocations([
  ['PAR', 'Paris', '', 'FR', 'city', 'PAR', ''],
  ['CDG', 'Charles de Gaulle International Airport', 'Paris', 'FR', 'large_airport', 'PAR', 'LFPG'],
  ['ORY', 'Paris-Orly Airport', 'Paris', 'FR', 'large_airport', 'PAR', 'LFPO'],
  ['LON', 'Londres', '', 'GB', 'city', 'LON', ''],
  ['LHR', 'London Heathrow Airport', 'Londres', 'GB', 'large_airport', 'LON', 'EGLL'],
  ['YUL', 'Montréal-Trudeau International Airport', 'Montréal', 'CA', 'large_airport', 'YMQ', 'CYUL'],
  ['LGB', 'Long Beach Airport', 'Long Beach', 'US', 'large_airport', 'LGB', 'KLGB'],
]);

test('IATA search resolves airports, cities, countries, accents and associated airports', () => {
  assert.equal(core.searchLocations(referenceLocations, 'cdg')[0].code, 'CDG');
  assert.deepEqual(core.searchLocations(referenceLocations, 'PAR').map(m => m.code), ['PAR', 'CDG', 'ORY']);
  assert.deepEqual(core.searchLocations(referenceLocations, 'LON').map(m => m.code).slice(0, 2), ['LON', 'LHR']);
  assert.equal(core.searchLocations(referenceLocations, 'montreal')[0].code, 'YUL');
  assert.equal(core.searchLocations(referenceLocations, 'canada')[0].code, 'YUL');
  assert.equal(core.searchLocations(referenceLocations, 'LFPG')[0].code, 'CDG');
  assert.equal(core.searchLocations(referenceLocations, 'nowhere').length, 0);
});

test('the complete bundled IATA snapshot has valid codes, provenance and essential city groups', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/iata.json'), 'utf8'));
  assert(data.locations.length > 9000);
  assert(data.updatedAt && data.sources.airports && data.sources.cities);
  assert(data.locations.every(row => /^[A-Z]{3}$/.test(row[0]) && row[1] && row[3]));
  const codes = new Set(data.locations.map(row => row[0]));
  for (const code of ['CDG', 'ORY', 'JFK', 'LHR', 'PAR', 'NYC', 'LON']) assert(codes.has(code), code);
  assert(data.locations.some(row => row[0] === 'CDG' && row[5] === 'PAR'));
  assert(data.locations.some(row => row[0] === 'LHR' && row[5] === 'LON'));
});
