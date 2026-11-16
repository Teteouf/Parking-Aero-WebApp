/*
 * Contributions : brouillons enregistrés sur l'appareil et message à transmettre.
 * Une contribution ne modifie jamais les données de l'application. Elle produit un
 * texte que la personne copie ou envoie elle-même depuis sa messagerie.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ParkingContributions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1;
  const DRAFT_LIMIT = 30;

  const KINDS = {
    confirm: { title: 'Confirmer cette information', subject: 'Confirmation' },
    correct: { title: 'Proposer une correction', subject: 'Correction proposée' },
    gate: { title: 'Je connais la porte', subject: 'Porte proposée' },
    stand: { title: 'Je connais le parking', subject: 'Parking proposé' },
    // Code introuvable : aucune fiche affichée, aucune correspondance supposée.
    propose: { title: 'Proposer un parking ou une correspondance', subject: 'Proposition' },
  };

  const CODE_TYPES = {
    stand: 'Parking',
    gate: 'Porte',
    unknown: 'Je ne sais pas',
  };

  const ORIGINS = {
    seen: 'Vu directement',
    document: 'Document interne',
    colleague: 'Transmis par un collègue',
    signage: 'Signalétique sur place',
  };

  const NATURES = {
    once: 'Observation ponctuelle',
    usual: 'Fonctionnement habituel',
  };

  const FIELDS = ['answer', 'date', 'origin', 'originDetail', 'nature', 'conditions', 'comment', 'proposedCode', 'codeType'];

  function clean(value, max = 600) {
    return typeof value === 'string' ? value.slice(0, max) : '';
  }

  /** Code proposé à partir du texte recherché : majuscules, sans espaces, 12 caractères au plus. */
  function proposalCode(query) {
    return proposalDraftCode(query).slice(0, 12);
  }

  /**
   * Clé de brouillon d'une proposition : la recherche entière (majuscules, sans espaces),
   * non tronquée, pour que deux recherches distinctes ne partagent jamais un brouillon.
   * Pour une recherche de 12 caractères au plus, elle est identique à l'ancienne clé.
   */
  function proposalDraftCode(query) {
    return typeof query === 'string' ? query.replace(/\s+/g, '').toUpperCase() : '';
  }

  function draftKey(kind, code) {
    return `${kind}:${code}`;
  }

  /** Brouillons stockés sous une clé distincte des préférences (favoris, historique). */
  function createDraftStore(storage, key) {
    let drafts = {};
    let saved = Boolean(storage);

    function reload() {
      try {
        const data = JSON.parse(storage ? storage.getItem(key) : 'null');
        drafts = data && data.version === VERSION && data.drafts && typeof data.drafts === 'object' ? data.drafts : {};
      } catch (error) { drafts = {}; if (error.name !== 'SyntaxError') saved = false; }
    }

    function persist() {
      try {
        if (!storage) throw new Error('Storage unavailable');
        storage.setItem(key, JSON.stringify({ version: VERSION, drafts }));
        saved = true;
      } catch (_) { saved = false; }
      return saved;
    }

    function get(kind, code) {
      const draft = drafts[draftKey(kind, code)];
      return draft ? { ...draft } : null;
    }

    function save(kind, code, values) {
      if (!KINDS[kind] || !code) return { saved: false };
      const draft = { kind, code: clean(code, 12), updatedAt: new Date().toISOString() };
      for (const field of FIELDS) draft[field] = clean(values[field]);
      drafts[draftKey(kind, code)] = draft;
      const keys = Object.keys(drafts).sort((a, b) => String(drafts[b].updatedAt).localeCompare(String(drafts[a].updatedAt)));
      for (const extra of keys.slice(DRAFT_LIMIT)) delete drafts[extra];
      return { saved: persist(), draft: { ...draft } };
    }

    function remove(kind, code) {
      delete drafts[draftKey(kind, code)];
      return persist();
    }

    reload();
    return { key, get, save, remove, reload, isSaved: () => saved, count: () => Object.keys(drafts).length };
  }

  /**
   * Texte de la contribution. `context` décrit la fiche telle qu'elle est affichée
   * (valeurs préremplies) ; `values` contient les réponses de la personne.
   */
  function buildMessage(kind, context, values) {
    const kindInfo = KINDS[kind];
    if (kind === 'propose') return buildProposal(context, values);
    const lines = [
      `Contribution CDG Parking — ${kindInfo.title}`,
      '',
      'Fiche affichée :',
      ...(context.type === 'gate' ? [`- Porte : ${context.code}`, '- Parking(s) affiché(s) : à confirmer'] :
        [`- Parking : ${context.code}`, `- Porte(s) affichée(s) : ${context.gates || 'à confirmer'}`]),
      `- Terminal : ${context.terminal}`,
      `- État de vérification affiché : ${context.status}`,
      '',
      'Contribution :',
    ];
    if (kind === 'confirm') lines.push(`- Je confirme : parking ${context.code} → porte(s) ${context.gates}`);
    else lines.push(`- ${{ gate: 'Porte proposée', stand: 'Parking proposé' }[kind] || 'Correction proposée'} : ${values.answer || '[non renseignée]'}`);
    lines.push(...observationLines(values));
    lines.push('', 'Cette contribution ne modifie pas les données de l’application : elle doit être vérifiée avant toute mise à jour.');
    return { subject: `[CDG Parking] ${kindInfo.subject} — ${context.code}`, body: lines.join('\n') };
  }

  function observationLines(values) {
    return [
      `- Date de l’observation : ${values.date || '[non renseignée]'}`,
      `- Origine : ${ORIGINS[values.origin] || '[non renseignée]'}${values.originDetail ? ` (${values.originDetail})` : ''}`,
      `- Nature : ${NATURES[values.nature] || '[non renseignée]'}`,
      `- Conditions éventuelles : ${values.conditions || 'aucune indiquée'}`,
      ...(values.comment ? [`- Précisions : ${values.comment}`] : []),
    ];
  }

  function buildProposal(context, values) {
    const code = String(values.proposedCode || context.code || '').toUpperCase();
    const lines = [
      `Contribution CDG Parking — ${KINDS.propose.title}`,
      '',
      `Recherche sans résultat : ${context.searched || context.code}`,
      '',
      'Proposition :',
      `- Code proposé : ${code || '[non renseigné]'}`,
      `- Nature du code : ${CODE_TYPES[values.codeType] || '[non renseignée]'}`,
      values.answer ? `- Correspondance proposée : ${values.answer}` : '- Correspondance : non indiquée (aucune n’est supposée)',
      ...observationLines(values),
      '',
      'Cette proposition ne modifie pas les données de l’application : elle doit être vérifiée avant toute mise à jour.',
    ];
    return { subject: `[CDG Parking] ${KINDS.propose.subject} — ${code}`, body: lines.join('\n') };
  }

  function mailtoHref(recipient, message) {
    return `mailto:${recipient}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.body)}`;
  }

  return { KINDS, ORIGINS, NATURES, CODE_TYPES, FIELDS, DRAFT_LIMIT, createDraftStore, buildMessage, mailtoHref, proposalCode, proposalDraftCode };
});
