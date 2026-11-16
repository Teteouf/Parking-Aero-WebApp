'use strict';
/*
 * Génère public/js/extension-data.js à partir des relevés sourcés de
 * docs/extension-cdg/terminaux/donnees/. Usage :
 *   node scripts/build-extension-data.js 2A 2B 2C 2D
 * Sans argument, reprend la liste des terminaux déjà publiés dans le fichier généré.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'docs', 'extension-cdg', 'terminaux', 'donnees');
const output = path.join(root, 'public', 'js', 'extension-data.js');
const read = name => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));

const ALL = ['2A', '2B', '2C', '2D'];
function currentTerminals() {
  try { return JSON.parse(fs.readFileSync(output, 'utf8').match(/"terminalsIncluded": (\[[^\]]*\])/)[1]); }
  catch (_) { return []; }
}
const terminals = process.argv.slice(2).length ? process.argv.slice(2) : currentTerminals();
for (const terminal of terminals) if (!ALL.includes(terminal)) throw new Error(`Terminal inconnu : ${terminal}`);

const stands = read('postes-eaip-ad2-8.json').postes;
const gates = read('portes-plan-paris-aeroport.json').portes;
const attach = read('rattachements.json');

// Contrôle de couverture : chaque poste relevé est classé une seule fois, et rien n'est inventé.
const classified = new Map();
for (const [terminal, groups] of Object.entries(attach.postes)) {
  for (const code of groups['face-batiment']) classified.set(code, { terminal, position: 'face-batiment' });
  for (const [code, reason] of Object.entries(groups.secteur)) {
    if (classified.has(code)) throw new Error(`Poste classé deux fois : ${code}`);
    classified.set(code, { terminal, position: 'secteur', reason });
  }
}
for (const stand of stands) if (!classified.has(stand.code)) throw new Error(`Poste non classé : ${stand.code}`);
for (const code of classified.keys()) if (!stands.some(stand => stand.code === code)) throw new Error(`Poste absent de l’eAIP : ${code}`);

const sources = {
  S1: { label: 'eAIP France, AD 2 LFPG, AD 2.8 item 5 « Points de vérification INS »', date: 'page du 01 OCT 2026, cycle AIRAC 11/26 (29/10/2026 au 25/11/2026)' },
  S2: { label: 'eAIP, carte AD 2 LFPG APDC 01 « Aires de stationnement »', date: '01 OCT 2026' },
  S2b: { label: 'eAIP, carte AD 2 LFPG GMC 03 « Mouvements à la surface »', date: '11 JUN 2026' },
  S3: { label: 'Plan interactif Paris Aéroport (Groupe ADP), fiches des points d’intérêt', date: 'non datée, consultée le 2026-11-15' },
};

const terminalSources = { '2A': ['S1', 'S2', 'S3'], '2B': ['S1', 'S2', 'S2b'], '2C': ['S1', 'S2', 'S3'], '2D': ['S1', 'S2', 'S2b'] };

const data = {
  version: 1,
  generatedFrom: 'docs/extension-cdg/terminaux/donnees',
  consulted: '2026-11-14 et 2026-11-15',
  terminalsIncluded: terminals,
  sources,
  terminals: Object.fromEntries(terminals.map(terminal => [terminal, { building: attach.batiments[terminal].etiquette, basis: attach.batiments[terminal].nomme_par }])),
  stands: stands.filter(stand => terminals.includes(classified.get(stand.code).terminal)).map(stand => {
    const { terminal, position, reason } = classified.get(stand.code);
    const certain = position === 'face-batiment';
    return {
      code: stand.code,
      terminal: certain ? terminal : null,
      sector: terminal,
      position,
      ins: `${stand.lat_dms} ${stand.lon_dms}`,
      basis: certain ? `Fait face au bâtiment « ${attach.batiments[terminal].etiquette} » sur APDC 01. ${attach.batiments[terminal].nomme_par}` : `${reason} Rattachement au terminal non établi.`,
      note: attach.notes[stand.code] || '',
      sources: certain ? terminalSources[terminal] : ['S1', 'S2'],
      relations: attach.relations.filter(relation => relation.stand === stand.code),
    };
  }),
  gates: gates.filter(gate => terminals.includes(gate.terminal)).map(gate => ({
    code: gate.code, terminal: gate.terminal, level: gate.level, poiId: gate.poiId, sources: ['S3'],
    relations: attach.relations.filter(relation => relation.gates && relation.gates.includes(gate.code)),
  })),
};

const banner = '/* Généré par scripts/build-extension-data.js : ne pas modifier à la main. */\n';
fs.writeFileSync(output, `${banner}(function (root) {\n  'use strict';\n  const data = ${JSON.stringify(data, null, 2).replace(/\n/g, '\n  ')};\n  if (typeof module === 'object' && module.exports) module.exports = data;\n  else root.PARKING_EXTENSION = data;\n})(typeof globalThis !== 'undefined' ? globalThis : this);\n`);
console.log(`Extension ${terminals.join(', ') || '(aucun terminal)'} : ${data.stands.length} postes, ${data.gates.length} portes, ${attach.relations.length} relations étayées.`);
