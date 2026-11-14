/*
 * Extension aux terminaux 2A à 2D : catalogue et recherche des postes avion et des
 * portes documentés. Les données viennent de extension-data.js (généré) ; ce module
 * ne contient aucune donnée aéroportuaire et ne touche pas aux 169 correspondances.
 */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = factory(isNode ? require('./core') : root.ParkingCore);
  if (isNode) module.exports = api;
  else root.ParkingExtension = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
  'use strict';
  const TERMINALS = ['2A', '2B', '2C', '2D'];

  function sourceList(data, ids) {
    return ids.map(id => ({ id, label: data.sources[id].label, date: data.sources[id].date }));
  }

  /**
   * Catalogue : postes et portes de l'extension, plus les postes du pilote dont le
   * terminal n'est pas encore intégré (jamais de doublon : l'extension prime).
   */
  function createCatalog(data, pilotStands = []) {
    const extension = data || { terminalsIncluded: [], stands: [], gates: [], sources: {} };
    const stands = extension.stands.map(stand => ({
      type: 'stand', code: stand.code, terminal: stand.terminal, sector: stand.sector, certain: Boolean(stand.terminal),
      position: stand.position, ins: stand.ins, basis: stand.basis, note: stand.note,
      sources: sourceList(extension, stand.sources), relations: stand.relations || [],
    }));
    for (const pilot of pilotStands) {
      if (stands.some(stand => stand.code === pilot.code) || extension.terminalsIncluded.includes(pilot.terminal)) continue;
      stands.push({ type: 'stand', code: pilot.code, terminal: pilot.terminal, sector: pilot.terminal, certain: true,
        position: 'face-batiment', ins: pilot.ins, basis: pilot.terminalBasis, note: pilot.note,
        sources: pilot.sources.map(source => ({ id: source.id, label: source.label, date: '' })), relations: [] });
    }
    const gates = extension.gates.map(gate => ({
      type: 'gate', code: gate.code, terminal: gate.terminal, sector: gate.terminal, certain: true, level: gate.level,
      poiId: gate.poiId, sources: sourceList(extension, gate.sources), relations: gate.relations || [],
    }));
    const sort = (a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true });
    return { stands: stands.sort(sort), gates: gates.sort(sort), terminalsIncluded: [...extension.terminalsIncluded],
      consulted: extension.consulted || '' };
  }

  function matchesFilter(item, filter) {
    return filter === 'all' || item.sector === filter;
  }

  /**
   * Recherche avec la même normalisation que les correspondances (B3 ≡ B03).
   * Sans texte : rien pour « Tous », tout le terminal pour un filtre 2A à 2D.
   */
  function search(catalog, query, filter = 'all') {
    if (filter !== 'all' && !TERMINALS.includes(filter)) return { stands: [], gates: [] };
    const text = core.normalize(query);
    const pick = list => list.filter(item => matchesFilter(item, filter));
    if (!text) return filter === 'all' ? { stands: [], gates: [] } : { stands: pick(catalog.stands), gates: pick(catalog.gates) };
    const code = core.pointCode(query);
    const exact = item => core.pointCode(item.code) === code;
    const exactStands = pick(catalog.stands).filter(exact);
    const exactGates = pick(catalog.gates).filter(exact);
    if (exactStands.length || exactGates.length) return { stands: exactStands, gates: exactGates };
    const needle = text.replace(/[\s.-]/g, '');
    if (needle.length < 2) return { stands: [], gates: [] };
    const contains = item => [item.code, item.sector].some(value => core.normalize(value).replace(/[\s.-]/g, '').includes(needle));
    return { stands: pick(catalog.stands).filter(contains), gates: pick(catalog.gates).filter(contains) };
  }

  function find(catalog, type, code) {
    return (type === 'gate' ? catalog.gates : catalog.stands).find(item => item.code === code) || null;
  }

  function terminalText(item) {
    return item.certain ? `Terminal ${item.terminal}` : `Terminal à confirmer (secteur ${item.sector})`;
  }

  return { TERMINALS, createCatalog, search, find, terminalText };
});
