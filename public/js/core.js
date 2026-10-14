(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ParkingCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  }

  function compact(value) {
    return normalize(value).replace(/[\s.-]/g, '');
  }

  function pointCode(value) {
    const code = compact(value);
    const match = code.match(/^([A-Z]+)0*(\d+)$/);
    return match ? match[1] + Number(match[2]) : code;
  }

  function searchParking(mappings, query, filter = 'all') {
    const text = normalize(query);
    const code = pointCode(query);
    const available = mappings.filter(m => {
      if (filter === 'access') return m.ramp || m.elevator;
      if (filter === '1') return m.terminal.startsWith('1');
      return filter === 'all' || m.terminal === filter;
    });
    if (!text) return available;
    const exact = available.filter(m => pointCode(m.parkingCode) === code || m.gates.some(g => pointCode(g) === code));
    if (exact.length) return exact;
    return available.filter(m => compact([m.parkingCode, ...m.gates, m.terminal, m.section,
      m.ramp ? 'rampe' : '', m.elevator ? 'ascenseur' : '', m.offsite ? 'au large' : ''].join(' ')).includes(compact(text)));
  }

  function countryName(code) {
    try { return new Intl.DisplayNames(['fr'], { type: 'region' }).of(code) || code; }
    catch (_) { return code; }
  }

  function prepareLocations(rows) {
    const countries = new Map();
    return rows.map(row => {
      const [code, name, city, country, type, cityCode, icao] = row;
      if (!countries.has(country)) countries.set(country, countryName(country));
      const countryLabel = countries.get(country);
      return { code, name, city, country, countryLabel, type, cityCode, icao,
        searchText: normalize([code, name, city, country, countryLabel, cityCode, icao].join(' ')) };
    });
  }

  function searchLocations(locations, query) {
    const text = normalize(query);
    if (!text) return [];
    const code = compact(query);
    const terms = text.split(/\s+/);
    const isKnownCode = locations.some(location => location.code === code || location.cityCode === code);
    return locations.filter(location => isKnownCode ? location.code === code || location.cityCode === code :
      terms.every(term => location.searchText.includes(term)))
      .sort((a, b) => {
        const rank = item => item.code === code ? 0 : item.cityCode === code ? 1 : item.code.startsWith(code) ? 2 : 3;
        return rank(a) - rank(b) || a.code.localeCompare(b.code) || a.name.localeCompare(b.name);
      });
  }

  return { normalize, pointCode, searchParking, prepareLocations, searchLocations };
});
