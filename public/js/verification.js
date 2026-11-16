/*
 * État de vérification des correspondances existantes.
 * Les postes du pilote 2B sont désormais repris par l’extension (extension-data.js).
 * Ces métadonnées sont volontairement séparées de mappings.js : elles ne modifient
 * aucune des 169 correspondances, elles les décrivent.
 *
 * Deux axes distincts :
 * - verification : ce que l'on sait de la vérification de la fiche ;
 * - usage : les conditions d'utilisation (fixe, variable…). Une correspondance
 *   variable peut très bien être vérifiée.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ParkingVerification = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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

  return { STATUS, USAGE, MANAGER_VALIDATED, verificationFor };
});
