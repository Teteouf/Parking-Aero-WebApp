'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDraftStore, buildMessage, mailtoHref, DRAFT_LIMIT, KINDS, CODE_TYPES, proposalCode } = require('../public/js/contributions');
const { createPreferences } = require('../public/js/preferences');

function memoryStorage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

const values = { answer: 'B22', date: '2026-11-14', origin: 'seen', originDetail: '', nature: 'usual', conditions: 'Vols Schengen', comment: '' };

test('a draft survives reopening and is stored apart from favorites and history', () => {
  const storage = memoryStorage();
  const preferences = createPreferences(storage, 'cdg-parking.preferences.v1:/');
  preferences.toggleFavorite({ mode: 'parking', query: 'E22' });
  const before = storage.getItem('cdg-parking.preferences.v1:/');
  const store = createDraftStore(storage, 'cdg-parking.contributions.v1:/');
  assert.equal(store.save('gate', 'B20', values).saved, true);
  assert.equal(storage.getItem('cdg-parking.preferences.v1:/'), before);
  const reopened = createDraftStore(storage, 'cdg-parking.contributions.v1:/');
  assert.equal(reopened.get('gate', 'B20').answer, 'B22');
  assert.equal(reopened.get('gate', 'B20').nature, 'usual');
  assert.equal(reopened.get('correct', 'B20'), null);
  reopened.remove('gate', 'B20');
  assert.equal(createDraftStore(storage, 'cdg-parking.contributions.v1:/').get('gate', 'B20'), null);
});

test('without storage the draft is kept for the session and reported as not saved', () => {
  const store = createDraftStore(undefined, 'k');
  assert.equal(store.save('confirm', 'F21', values).saved, false);
  assert.equal(store.isSaved(), false);
});

test('corrupted or unknown draft data is ignored', () => {
  const storage = memoryStorage();
  storage.setItem('k', '{not json');
  assert.equal(createDraftStore(storage, 'k').count(), 0);
  storage.setItem('k', JSON.stringify({ version: 99, drafts: { 'gate:B20': {} } }));
  assert.equal(createDraftStore(storage, 'k').count(), 0);
});

test('drafts are bounded', () => {
  const store = createDraftStore(memoryStorage(), 'k');
  for (let i = 0; i < DRAFT_LIMIT + 5; i++) store.save('correct', 'E' + i, values);
  assert.equal(store.count(), DRAFT_LIMIT);
});

test('the message carries the prefilled values and the answers, without claiming anything was sent', () => {
  const context = { code: 'B20', gates: '', terminal: '2B', status: 'Porte à confirmer' };
  const message = buildMessage('gate', context, values);
  assert.equal(message.subject, '[CDG Parking] Porte proposée — B20');
  for (const part of ['Parking : B20', 'Porte(s) affichée(s) : à confirmer', 'Porte proposée : B22', 'Date de l’observation : 2026-11-14',
    'Origine : Vu directement', 'Nature : Fonctionnement habituel', 'Conditions éventuelles : Vols Schengen', 'ne modifie pas les données']) {
    assert(message.body.includes(part), part);
  }
  assert.doesNotMatch(message.body, /envoyé|reçu|merci pour votre envoi/i);
});

test('a confirmation restates the displayed mapping', () => {
  const message = buildMessage('confirm', { code: 'F21', gates: 'F21', terminal: '2F - Porte F1', status: 'Validée par le responsable' },
    { ...values, answer: '', nature: 'once' });
  assert.match(message.body, /Je confirme : parking F21 → porte\(s\) F21/);
  assert.match(message.body, /Nature : Observation ponctuelle/);
});

test('the mailto link is fully encoded', () => {
  const href = mailtoHref('agent@example.test', { subject: 'A & B', body: 'ligne 1\nligne 2 ?' });
  assert.equal(href, 'mailto:agent@example.test?subject=A%20%26%20B&body=ligne%201%0Aligne%202%20%3F');
});

/* ---------- Proposition depuis une recherche sans résultat ---------- */
const proposal = { answer: '', date: '2026-11-15', origin: 'signage', originDetail: '', nature: 'once', conditions: '', comment: '',
  proposedCode: 'ZZ98', codeType: 'gate' };

test('the proposal kind and code types are declared', () => {
  assert.equal(KINDS.propose.title, 'Proposer un parking ou une correspondance');
  assert.deepEqual(CODE_TYPES, { stand: 'Parking', gate: 'Porte', unknown: 'Je ne sais pas' });
});

test('the searched text becomes an editable code: upper case, no spaces, at most 12 characters', () => {
  assert.equal(proposalCode(' zz 99 '), 'ZZ99');
  assert.equal(proposalCode('abcdefghijklmnop'), 'ABCDEFGHIJKL');
  assert.equal(proposalCode(undefined), '');
});

test('a proposal without an answer does not assume any mapping and is not presented as sent', () => {
  const message = buildMessage('propose', { code: 'ZZ99', searched: 'zz99' }, proposal);
  assert.equal(message.subject, '[CDG Parking] Proposition — ZZ98');
  for (const part of ['Recherche sans résultat : zz99', 'Code proposé : ZZ98', 'Nature du code : Porte',
    'Correspondance : non indiquée (aucune n’est supposée)', 'Origine : Signalétique sur place', 'ne modifie pas les données']) {
    assert(message.body.includes(part), part);
  }
  assert.doesNotMatch(message.body, /envoyé|reçu/i);
  assert.doesNotMatch(message.body, /Fiche affichée/);
});

test('a proposal with an answer carries it as a proposal only', () => {
  const message = buildMessage('propose', { code: 'ZZ99', searched: 'ZZ99' }, { ...proposal, answer: 'K43', codeType: 'unknown' });
  assert.match(message.body, /Correspondance proposée : K43/);
  assert.match(message.body, /Nature du code : Je ne sais pas/);
});

test('a proposal draft keeps the corrected code and its type, apart from preferences', () => {
  const storage = memoryStorage();
  const preferences = createPreferences(storage, 'cdg-parking.preferences.v1:/');
  preferences.toggleFavorite({ mode: 'parking', query: 'E22' });
  preferences.rememberSearch({ mode: 'parking', query: 'E22' });
  const before = storage.getItem('cdg-parking.preferences.v1:/');
  const store = createDraftStore(storage, 'cdg-parking.contributions.v1:/');
  assert.equal(store.save('propose', 'ZZ99', proposal).saved, true);
  assert.equal(storage.getItem('cdg-parking.preferences.v1:/'), before);
  const reopened = createDraftStore(storage, 'cdg-parking.contributions.v1:/').get('propose', 'ZZ99');
  assert.equal(reopened.proposedCode, 'ZZ98');
  assert.equal(reopened.codeType, 'gate');
});
