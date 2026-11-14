/*
 * État de vérification et postes documentés du pilote 2B.
 * Ces métadonnées sont volontairement séparées de mappings.js : elles ne modifient
 * aucune des 169 correspondances, elles les décrivent.
 *
 * Deux axes distincts :
 * - verification : ce que l'on sait de la vérification de la fiche ;
 * - usage : les conditions d'utilisation (fixe, variable…). Une correspondance
 *   variable peut très bien être vérifiée.
 */
(function (root, factory) {
  const api = factory(root.ParkingCore || (typeof require === 'function' ? require('./core') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ParkingVerification = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
  'use strict';

  const STATUS = {
    managerValidated: {
      id: 'validee-responsable',
      label: 'Validée par le responsable',
      detail: 'Déclaration du responsable de l’application. Ce n’est pas une observation terrain datée.',
    },
    toDocument: {
      id: 'a-documenter',
      label: 'Vérification à documenter',
      detail: 'Aucune source de vérification n’est encore enregistrée pour cette fiche. Cela ne signifie pas qu’elle est erronée.',
    },
  };

  const USAGE = {
    undocumented: { id: 'non-documentees', label: 'Non documentées' },
  };

  // Les neuf fiches déclarées par Theo. Le parking ET la porte sont contrôlés : si la
  // correspondance change un jour, la déclaration ne s'y applique plus automatiquement.
  const MANAGER_VALIDATED = ['F21', 'F23', 'F24', 'F25', 'F41', 'F43', 'F44', 'F45', 'F46']
    .map(code => ({ parkingCode: code, gates: [code] }));

  function sameGates(a, b) {
    return a.length === b.length && a.every((gate, index) => gate === b[index]);
  }

  /** Métadonnées de vérification d'une correspondance existante (jamais modifiée). */
  function verificationFor(mapping) {
    const declared = MANAGER_VALIDATED.some(item => item.parkingCode === mapping.parkingCode && sameGates(item.gates, mapping.gates));
    return { status: declared ? STATUS.managerValidated : STATUS.toDocument, usage: USAGE.undocumented };
  }

  const SOURCES = {
    S1: 'eAIP France, AD 2 LFPG, AD 2.8 item 5 « Points de vérification INS », page du 01 OCT 2026 (cycle AIRAC 11/26, valable jusqu’au 25/11/2026)',
    S2: 'eAIP, carte AD 2 LFPG APDC 01 « Aires de stationnement », 01 OCT 2026',
    S2b: 'eAIP, carte AD 2 LFPG GMC 03 « Mouvements à la surface », 11 JUN 2026',
    S3: 'Plan interactif Paris Aéroport (Groupe ADP), données non datées',
  };

  // Postes documentés par le pilote 2B (docs/extension-cdg/pilote-2b/observations.json).
  // Aucune porte n'est attribuée : la porte reste à confirmer.
  const DOCUMENTED_STANDS = [
    { code: 'B20', observation: 'P-B20', ins: '49°00\'18.29"N 002°33\'37.48"E', homonymGate: 'B20',
      note: 'Une porte B20 existe aussi en 2B. Aucune source ne relie le poste B20 à cette porte.' },
    { code: 'B24', observation: 'P-B24', ins: '49°00\'16.61"N 002°33\'34.55"E', homonymGate: 'B24',
      note: 'Point situé à environ 12 m de celui du poste B26 : postes peut-être superposés (hypothèse). Une porte B24 existe aussi en 2B, sans lien établi.' },
    { code: 'B26', observation: 'P-B26', ins: '49°00\'16.99"N 002°33\'34.43"E', homonymGate: 'B26',
      note: 'Poste B le plus à l’ouest de sa rangée. Une porte B26 existe aussi en 2B, sans lien établi.' },
  ].map(stand => Object.freeze({
    ...stand,
    kind: 'documented',
    terminal: '2B',
    terminalBasis: 'Déduction cartographique : le poste fait face au bâtiment « B » (APDC 01), nommé « TERMINAL 2B » sur GMC 03.',
    gate: null,
    gateLabel: 'Porte à confirmer',
    sources: ['S1', 'S2', 'S2b'].map(id => ({ id, label: SOURCES[id] })),
    consulted: '2026-11-14 et 2026-11-15',
    verification: { id: 'porte-a-confirmer', label: 'Porte à confirmer',
      detail: 'Le poste est documenté par des sources publiques. Aucune porte ne lui est attribuée tant qu’elle n’est pas confirmée.' },
    usage: USAGE.undocumented,
  }));

  /** Recherche dans les postes documentés, avec la même normalisation que searchParking. */
  function searchDocumented(query, filter = 'all') {
    if (!core || filter !== 'all') return [];
    const text = core.normalize(query);
    if (!text) return [];
    const code = core.pointCode(query);
    const exact = DOCUMENTED_STANDS.filter(stand => core.pointCode(stand.code) === code);
    if (exact.length) return exact;
    const needle = text.replace(/[\s.-]/g, '');
    if (needle.length < 2) return [];
    return DOCUMENTED_STANDS.filter(stand => [stand.code, stand.terminal, 'PILOTE', 'POSTE DOCUMENTE']
      .some(value => core.normalize(value).replace(/[\s.-]/g, '').includes(needle)));
  }

  function findDocumented(code) {
    return DOCUMENTED_STANDS.find(stand => stand.code === code) || null;
  }

  return { STATUS, USAGE, MANAGER_VALIDATED, DOCUMENTED_STANDS, verificationFor, searchDocumented, findDocumented };
});
