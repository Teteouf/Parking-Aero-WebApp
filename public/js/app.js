(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const { searchParking, codeRole, orderByCodeRole, prepareLocations, searchLocations, pointCode, normalize } = window.ParkingCore;
  const { verificationFor } = window.ParkingVerification;
  const extension = window.ParkingExtension;
  // Données d'extension isolées (extension-data.js), générées depuis docs/extension-cdg/terminaux.
  const catalog = extension.createCatalog(window.PARKING_EXTENSION);
  const contributions = window.ParkingContributions;
  const mappings = window.PARKING_MAPPINGS;
  const appBase = new URL('./', document.baseURI);
  const shareUrl = 'https://teteouf.github.io/Parking-Aero-WebApp/';
  // Destinataire déjà configuré pour les signalements depuis une fiche.
  const reportRecipient = 'dargos.theo@hotmail.fr';
  let deviceStorage;
  try { deviceStorage = window.localStorage; } catch (_) { /* Session-only fallback. */ }
  const preferences = window.ParkingPreferences.createPreferences(deviceStorage, 'cdg-parking.preferences.v1:' + appBase.pathname);
  // Clé distincte : les brouillons ne touchent jamais aux favoris ni à l'historique.
  const drafts = contributions.createDraftStore(deviceStorage, 'cdg-parking.contributions.v1:' + appBase.pathname);
  const state = { mode: 'parking', filter: 'all', additionalFilters: false, queries: { parking: '', iata: '' }, locations: null,
    iataData: null, iataPromise: null, limit: 40, offlineReady: false, waitingWorker: null };
  let toastTimer;
  let historyTimer;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function badgeHtml(mapping) {
    const verified = verificationFor(mapping).status.id === 'validee-responsable';
    return (verified ? '<span class="badge verified">Validée par le responsable</span>' : '') +
      (mapping.offsite ? '<span class="badge offsite">Au large</span>' : '') +
      (mapping.ramp ? '<span class="badge access">Rampe</span>' : '') +
      (mapping.elevator ? '<span class="badge access">Ascenseur</span>' : '');
  }

  const roleText = {
    parking: { visible: 'est ici le parking', spoken: 'est ici le parking (poste avion)' },
    gate: { visible: 'est ici la porte', spoken: 'est ici la porte' },
    both: { visible: 'est ici parking et porte', spoken: 'est ici à la fois le parking (poste avion) et la porte' },
  };

  function mappingHtml(mapping, query = '') {
    const role = codeRole(mapping, query);
    const code = pointCode(query);
    const hit = value => pointCode(value) === code ? `<span class="code-hit">${escapeHtml(value)}</span>` : escapeHtml(value);
    const gatesHtml = mapping.gates.map(hit).join(', ');
    const searched = role ? escapeHtml(role === 'gate' ? mapping.gates.find(g => pointCode(g) === code) : mapping.parkingCode) : '';
    const gatesLabel = `porte${mapping.gates.length > 1 ? 's' : ''} ${escapeHtml(mapping.gates.join(', '))}`;
    return `<article class="mapping-card"${role ? ` data-role="${role}"` : ''}><button type="button" class="mapping-open" data-parking="${escapeHtml(mapping.parkingCode)}" aria-label="${role ? `${searched} ${roleText[role].spoken}. ` : ''}Parking ${escapeHtml(mapping.parkingCode)}, ${gatesLabel}, détails">
      ${role ? `<span class="match-role"><span class="match-code">${searched}</span> ${roleText[role].visible}</span>` : ''}
      <span class="mapping-line"><span class="mapping-side${role === 'parking' || role === 'both' ? ' is-match' : ''}"><span class="code-label">Parking</span><span class="point-code">${role === 'parking' || role === 'both' ? hit(mapping.parkingCode) : escapeHtml(mapping.parkingCode)}</span></span>
      <span class="direction" aria-hidden="true">↔</span><span class="mapping-side${role === 'gate' || role === 'both' ? ' is-match' : ''}"><span class="code-label">Porte${mapping.gates.length > 1 ? 's' : ''}</span><span class="point-code gate-code">${gatesHtml}</span></span></span>
      <span class="mapping-meta">Terminal ${escapeHtml(mapping.terminal)} - Porte ${escapeHtml(mapping.section)}</span>
      ${badgeHtml(mapping) ? `<span class="badges">${badgeHtml(mapping)}</span>` : ''}</button>${favoriteButton({ mode: 'parking', query: mapping.parkingCode }, 'la correspondance ' + mapping.parkingCode)}</article>`;
  }

  function relationGates(item) {
    return [...new Set(item.relations.flatMap(relation => relation.gates || []))];
  }

  /** Rôle du code recherché, présenté comme sur les fiches 2E. */
  function documentedRole(item, query, kind) {
    if (!query || pointCode(item.code) !== pointCode(query)) return '';
    return `<span class="match-role"><span class="match-code">${escapeHtml(item.code)}</span> est ici ${kind === 'gate' ? 'la porte' : 'le parking'}</span>`;
  }

  function documentedMeta(item, source) {
    return `<span class="mapping-meta">${escapeHtml(extension.terminalText(item))} · relevé ${source}</span>`;
  }

  /** Parking (poste avion) documenté : la porte n'est affichée que si une relation est étayée. */
  function standHtml(stand, query = '') {
    const gates = relationGates(stand);
    const gateText = gates.length ? gates.join(', ') : 'À confirmer';
    return `<article class="stand-card"><button type="button" class="mapping-open" data-documented="stand" data-code="${escapeHtml(stand.code)}" aria-label="Parking ${escapeHtml(stand.code)}, ${gates.length ? 'porte ' + escapeHtml(gateText) + ' selon une source citée' : 'porte à confirmer'}, ${escapeHtml(extension.terminalText(stand))}, détails">
      ${documentedRole(stand, query, 'stand')}
      <span class="mapping-line"><span class="mapping-side"><span class="code-label">Parking</span><span class="point-code">${escapeHtml(stand.code)}</span></span>
      <span class="direction" aria-hidden="true">↔</span><span class="mapping-side"><span class="code-label">Porte</span><span class="point-code ${gates.length ? 'gate-code' : 'gate-pending'}">${escapeHtml(gateText)}</span></span></span>
      ${documentedMeta(stand, 'eAIP')}
      ${stand.certain ? '' : '<span class="badges"><span class="badge pending">Terminal à confirmer</span></span>'}</button></article>`;
  }

  /** Porte documentée : le parking reste à confirmer sans relation étayée. */
  function gateDocHtml(gate, query = '') {
    const stands = gate.relations.map(relation => relation.stand);
    const standText = stands.length ? stands.join(', ') : 'À confirmer';
    return `<article class="stand-card"><button type="button" class="mapping-open" data-documented="gate" data-code="${escapeHtml(gate.code)}" aria-label="Porte ${escapeHtml(gate.code)}, ${stands.length ? 'parking ' + escapeHtml(standText) : 'parking à confirmer'}, ${escapeHtml(extension.terminalText(gate))}, détails">
      ${documentedRole(gate, query, 'gate')}
      <span class="mapping-line is-gate-first"><span class="mapping-side"><span class="code-label">Parking</span><span class="point-code ${stands.length ? '' : 'gate-pending'}">${escapeHtml(standText)}</span></span>
      <span class="direction" aria-hidden="true">↔</span><span class="mapping-side"><span class="code-label">Porte</span><span class="point-code gate-code">${escapeHtml(gate.code)}</span></span></span>
      ${documentedMeta(gate, 'plan Paris Aéroport')}</button></article>`;
  }

  function plural(count, singular, pluralForm) {
    return `${count} ${count === 1 ? singular : pluralForm}`;
  }


  function favoriteButton(item, label, action = false) {
    const selected = preferences.hasFavorite(item);
    return `<button type="button" class="favorite-button${action ? ' favorite-action secondary-button' : ''}" data-favorite-mode="${escapeHtml(item.mode)}" data-favorite-query="${escapeHtml(item.query)}" data-favorite-label="${escapeHtml(label)}" aria-pressed="${selected}" aria-label="${selected ? 'Retirer' : 'Ajouter'} ${escapeHtml(label)} ${selected ? 'des' : 'aux'} favoris"><span data-favorite-icon aria-hidden="true">${selected ? '★' : '☆'}</span>${action ? `<span data-favorite-text>${selected ? 'Retirer des favoris' : 'Ajouter aux favoris'}</span>` : ''}</button>`;
  }

  function shortcutLabel(item) {
    const mapping = item.mode === 'parking' && mappings.find(m => m.parkingCode === item.query);
    return mapping ? `${mapping.parkingCode} ↔ ${mapping.gates.join(', ')}` : item.query;
  }

  function shortcutHtml(item, favorite = false) {
    const label = favorite ? shortcutLabel(item) : item.query;
    return `<div class="shortcut${favorite ? ' favorite' : ''}"><button type="button" class="shortcut-open" data-shortcut-mode="${escapeHtml(item.mode)}" data-shortcut-query="${escapeHtml(item.query)}" data-shortcut-kind="${favorite ? 'favorite' : 'history'}" aria-label="${favorite ? 'Ouvrir le favori' : 'Relancer la recherche'} ${escapeHtml(label)}, ${item.mode === 'parking' ? 'parking et porte' : 'IATA'}"><span class="shortcut-label">${escapeHtml(label)}</span><span class="shortcut-mode">${item.mode === 'parking' ? 'Parking / porte' : 'IATA'}</span></button>${favorite ? `<button type="button" class="shortcut-remove" data-remove-mode="${escapeHtml(item.mode)}" data-remove-query="${escapeHtml(item.query)}" aria-label="Retirer ${escapeHtml(label)} des favoris">×</button>` : ''}</div>`;
  }

  function renderShortcuts() {
    $('preferencesScope').textContent = preferences.isSaved() ? 'Sur cet appareil' : 'Cette session';
    const favorites = preferences.getFavorites();
    const history = preferences.getHistory();
    $('quickAccess').hidden = Boolean($('searchInput').value.trim()) || (!favorites.length && !history.length);
    $('favoritesSection').hidden = !favorites.length;
    $('favoritesList').innerHTML = favorites.map(item => shortcutHtml(item, true)).join('');
    $('historySection').hidden = !history.length;
    $('historyList').innerHTML = history.map(item => shortcutHtml(item)).join('');
  }

  function syncFavoriteButtons() {
    for (const button of document.querySelectorAll('[data-favorite-mode]')) {
      const selected = preferences.hasFavorite({ mode: button.dataset.favoriteMode, query: button.dataset.favoriteQuery });
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `${selected ? 'Retirer' : 'Ajouter'} ${button.dataset.favoriteLabel} ${selected ? 'des' : 'aux'} favoris`);
      button.querySelector('[data-favorite-icon]').textContent = selected ? '★' : '☆';
      const text = button.querySelector('[data-favorite-text]');
      if (text) text.textContent = selected ? 'Retirer des favoris' : 'Ajouter aux favoris';
    }
  }

  function toggleFavorite(button) {
    const result = preferences.toggleFavorite({ mode: button.dataset.favoriteMode, query: button.dataset.favoriteQuery });
    if (result.limit) { showToast('50 favoris maximum : retirez un favori pour en ajouter un autre.'); return; }
    if (!result.changed) return;
    syncFavoriteButtons();
    renderShortcuts();
    showToast((result.favorite ? 'Favori ajouté' : 'Favori retiré') + (result.saved ? '' : ' pour cette session seulement'));
  }

  function rememberCurrentSearch(includeWords = false) {
    const query = $('searchInput').value.trim();
    if (query.length < 2 || query.length > 80) return;
    let matches;
    let exact;
    if (state.mode === 'parking') {
      const documented = extension.search(catalog, query, state.filter);
      matches = [...searchParking(mappings, query, state.filter), ...documented.stands, ...documented.gates];
      exact = matches.some(m => m.type ? pointCode(m.code) === pointCode(query) : codeRole(m, query));
    } else {
      if (!state.locations) return;
      matches = searchLocations(state.locations, query);
      const code = normalize(query).replace(/[\s.-]/g, '');
      exact = matches.some(location => location.code === code || location.cityCode === code);
    }
    if (!matches.length || (!includeWords && !exact)) return;
    if (preferences.rememberSearch({ mode: state.mode, query: exact ? query.toUpperCase() : query })) renderShortcuts();
  }

  function emptyHtml(title, description, quickCodes = false) {
    return `<div class="empty-state"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p>${quickCodes ?
      '<div class="quick-codes">' + ['CDG', 'ORY', 'LON', 'JFK', 'DXB'].map(code => `<button class="filter" type="button" data-iata="${code}">${code}</button>`).join('') + '</div>' : ''}</div>`;
  }

  function locationHtml(location) {
    const isCity = location.type === 'city';
    const label = isCity ? 'Ville / zone' : location.type === 'closed' ? 'Aéroport fermé' : location.type === 'heliport' ? 'Héliport' : 'Aéroport';
    const links = isCity ? state.locations.filter(item => item.type !== 'city' && item.cityCode === location.code)
      .map(item => `<button type="button" data-iata="${escapeHtml(item.code)}">${escapeHtml(item.code)}</button>`).join('') : '';
    return `<article class="iata-card"><div class="iata-top"><span class="iata-code">${escapeHtml(location.code)}</span><span class="iata-tools"><span class="badge">${label}</span>${favoriteButton({ mode: 'iata', query: location.code }, 'le code ' + location.code)}</span></div>
      <h3>${escapeHtml(location.name)}</h3><p>${escapeHtml([location.city, location.countryLabel].filter(Boolean).join(' · '))}</p>
      ${!isCity && location.cityCode && location.cityCode !== location.code ? `<p>Code ville : ${escapeHtml(location.cityCode)}</p>` : ''}
      ${links ? `<div class="iata-links" aria-label="Aéroports associés">${links}</div>` : ''}</article>`;
  }

  function render() {
    const query = $('searchInput').value;
    state.queries[state.mode] = query;
    $('clearButton').hidden = !query;
    $('showMoreButton').hidden = true;
    renderShortcuts();
    const secondaryFilter = ['1', 'access', ...extension.TERMINALS].includes(state.filter);
    $('additionalFilters').hidden = !state.additionalFilters;
    $('filterMoreButton').textContent = (state.additionalFilters ? 'Moins' : 'Plus') + (secondaryFilter ? ' · 1' : '');
    $('filterMoreButton').classList.toggle('active', secondaryFilter);
    $('filterMoreButton').setAttribute('aria-expanded', String(state.additionalFilters));
    $('filterMoreButton').setAttribute('aria-label', (state.additionalFilters ? 'Masquer' : 'Afficher') + ' les autres filtres' + (secondaryFilter ? ', un filtre actif' : ''));
    const filterLabels = { '2E': 'Terminal 2E', '2F': 'Terminal 2F', '2G': 'Terminal 2G', '1': 'Terminal 1', access: 'Rampe / ascenseur',
      ...Object.fromEntries(extension.TERMINALS.map(terminal => [terminal, `Terminal ${terminal}`])) };
    $('searchHint').textContent = state.mode === 'iata' ? 'Aéroports & villes' : filterLabels[state.filter] || 'Parking ↔ porte';
    if (state.mode === 'parking') {
      const matches = orderByCodeRole(searchParking(mappings, query, state.filter), query);
      const documented = extension.search(catalog, query, state.filter);
      const documentedCount = documented.stands.length + documented.gates.length;
      const pending = extension.TERMINALS.includes(state.filter) && !catalog.terminalsIncluded.includes(state.filter);
      const parts = [plural(matches.length, 'correspondance', 'correspondances')];
      if (documented.stands.length) parts.push(plural(documented.stands.length, 'parking documenté', 'parkings documentés'));
      if (documented.gates.length) parts.push(plural(documented.gates.length, 'porte documentée', 'portes documentées'));
      $('resultsCount').textContent = query || state.filter !== 'all' ? parts.join(' · ') : `${mappings.length} points de parking`;
      const documentedBlock = documentedCount ? `<section class="results-group" aria-labelledby="documentedTitle"><h3 id="documentedTitle">Parkings et portes documentés · terminaux 2A à 2D</h3>
        <p>Relevés dans des sources publiques (eAIP, plan Paris Aéroport). Ils ne font pas partie des ${mappings.length} correspondances : sans relation sourcée, la porte ou le parking reste à confirmer.</p></section>${documented.stands.map(stand => standHtml(stand, query)).join('')}${documented.gates.map(gate => gateDocHtml(gate, query)).join('')}` : '';
      $('results').innerHTML = matches.length || documentedCount ? matches.map(mapping => mappingHtml(mapping, query)).join('') + documentedBlock :
        pending ? emptyHtml(`Terminal ${state.filter} pas encore intégré`, 'Les parkings et portes de ce terminal seront ajoutés dans une prochaine étape.') :
        emptyHtml('Aucune correspondance', 'Essayez un autre code ou changez le filtre de terminal.');
      return;
    }
    if (!state.locations) {
      $('resultsCount').textContent = 'Aéroports & villes';
      $('results').innerHTML = emptyHtml('Le monde en trois lettres', 'Recherchez un code IATA, un aéroport, une ville ou un pays.', true);
      loadIata().catch(() => {
        if (state.mode !== 'iata') return;
        $('results').innerHTML = emptyHtml('Répertoire indisponible', 'Ouvrez une fois l’application en ligne pour enregistrer le répertoire.');
      });
      return;
    }
    if (!query.trim()) {
      $('resultsCount').textContent = `${state.locations.length.toLocaleString('fr-FR')} entrées IATA`;
      $('results').innerHTML = emptyHtml('Le monde en trois lettres', 'Recherchez un code IATA, un aéroport, une ville ou un pays.', true);
      return;
    }
    const matches = searchLocations(state.locations, query);
    $('resultsCount').textContent = `${matches.length.toLocaleString('fr-FR')} résultat${matches.length === 1 ? '' : 's'}`;
    $('results').innerHTML = matches.length ? matches.slice(0, state.limit).map(locationHtml).join('') : emptyHtml('Aucun code trouvé', 'Essayez le nom de la ville, de l’aéroport ou son code à trois lettres.');
    $('showMoreButton').hidden = matches.length <= state.limit;
  }

  function setMode(mode) {
    if (mode === state.mode) return;
    clearTimeout(historyTimer);
    rememberCurrentSearch(true);
    state.queries[state.mode] = $('searchInput').value;
    state.mode = mode;
    state.limit = 40;
    for (const tab of document.querySelectorAll('[data-mode]')) {
      const selected = tab.dataset.mode === mode;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    $('parkingFilters').hidden = mode !== 'parking';
    $('searchInput').value = state.queries[mode];
    $('searchInput').placeholder = mode === 'parking' ? 'Parking ou porte · E22, K43…' : 'Code, aéroport ou ville · CDG, Paris…';
    document.querySelector('label[for="searchInput"]').textContent = mode === 'parking' ? 'Rechercher un parking ou une porte' : 'Rechercher un code IATA, un aéroport ou une ville';
    $('resultsPanel').setAttribute('aria-labelledby', mode === 'parking' ? 'parkingTab' : 'iataTab');
    render();
    window.scrollTo({ top: 0 });
  }

  async function loadIata() {
    if (state.iataPromise) return state.iataPromise;
    state.iataPromise = (async () => {
      const response = await fetch(new URL('data/iata.json', appBase));
      if (!response.ok) throw new Error('IATA unavailable');
      const data = await response.json();
      if (!Array.isArray(data.locations) || !data.locations.length) throw new Error('IATA invalid');
      state.iataData = data;
      state.locations = prepareLocations(data.locations);
      if (state.mode === 'iata') render();
      if (state.mode === 'iata') rememberCurrentSearch();
      return data;
    })();
    try { return await state.iataPromise; }
    catch (error) { state.iataPromise = null; throw error; }
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 2500);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copié dans le presse-papiers');
    } catch (_) { showToast('Copie indisponible sur cet appareil'); }
  }

  function verificationHtml(status, usage) {
    return `<section class="verification" aria-labelledby="verificationTitle"><h3 id="verificationTitle">Vérification</h3>
      <dl class="detail-list"><div><dt>État</dt><dd>${escapeHtml(status.label)}</dd></div><div><dt>Conditions d’utilisation</dt><dd>${escapeHtml(usage.label)}</dd></div></dl>
      <p class="verification-note">${escapeHtml(status.detail)}</p></section>`;
  }

  function contributeHtml(kinds) {
    return `<section class="contribute" aria-labelledby="contributeTitle"><h3 id="contributeTitle">Contribuer</h3>
      <p>Préparez un message depuis cet appareil, même hors connexion. Il ne modifie pas les données.</p>
      <div class="contribute-actions">${kinds.map(kind => `<button type="button" class="secondary-button" data-contribute="${kind}">${escapeHtml(contributions.KINDS[kind].title)}</button>`).join('')}</div></section>`;
  }

  function openDetail(code) {
    const mapping = mappings.find(item => item.parkingCode === code);
    if (!mapping) return;
    const verification = verificationFor(mapping);
    state.detail = { type: 'mapping', kinds: ['confirm', 'correct'], code: mapping.parkingCode, gates: mapping.gates.join(', '),
      terminal: `${mapping.terminal} - Porte ${mapping.section}`, status: verification.status.label };
    $('detailTitle').textContent = 'Détails de la correspondance';
    $('detailBody').innerHTML = `<div class="detail-codes"><div><span class="code-label">Parking</span><span class="point-code">${escapeHtml(mapping.parkingCode)}</span></div><span class="direction" aria-hidden="true">↔</span><div><span class="code-label">Porte${mapping.gates.length > 1 ? 's' : ''}</span><span class="point-code gate-code">${escapeHtml(mapping.gates.join(', '))}</span></div></div>
      <dl class="detail-list"><div><dt>Terminal</dt><dd>${escapeHtml(mapping.terminal)}</dd></div><div><dt>Porte</dt><dd>${escapeHtml(mapping.section)}</dd></div>
      ${mapping.offsite ? '<div><dt>Emplacement</dt><dd>Au large</dd></div>' : ''}${mapping.ramp ? '<div><dt>Accès</dt><dd>Rampe</dd></div>' : ''}${mapping.elevator ? '<div><dt>Accès</dt><dd>Ascenseur</dd></div>' : ''}</dl>
      <div class="detail-actions">${favoriteButton({ mode: 'parking', query: mapping.parkingCode }, 'la correspondance ' + mapping.parkingCode, true)}<button type="button" class="primary-button" data-copy="${escapeHtml(mapping.gates.join(', '))}">Copier ${mapping.gates.length > 1 ? 'les portes' : 'la porte'}</button><button type="button" class="secondary-button" data-copy="${escapeHtml(mapping.parkingCode)}">Copier le parking</button></div>
      ${verificationHtml(verification.status, verification.usage)}${contributeHtml(state.detail.kinds)}`;
    $('detailDialog').showModal();
  }

  function sourcesHtml(item) {
    return `<section class="sources" aria-labelledby="sourcesTitle"><h3 id="sourcesTitle">Sources</h3><ul>${item.sources.map(source => `<li><strong>${escapeHtml(source.id)}</strong> · ${escapeHtml(source.label)}${source.date ? ` (${escapeHtml(source.date)})` : ''}</li>`).join('')}</ul>
      <p class="verification-note">Consultées les ${escapeHtml(catalog.consulted || '2026-11-14 et 2026-11-15')}. Cet élément ne fait pas partie des ${mappings.length} correspondances.</p></section>`;
  }

  function relationsHtml(item) {
    if (!item.relations.length) return '';
    return `<section class="verification" aria-labelledby="relationsTitle"><h3 id="relationsTitle">Correspondance documentée</h3><ul class="relation-list">${item.relations.map(relation =>
      `<li>Parking ${escapeHtml(relation.stand)} → porte ${escapeHtml((relation.gates || []).join(', '))}${relation.conditions ? ` · ${escapeHtml(relation.conditions)}` : ''}<br><span class="verification-note">Provenance : ${escapeHtml(relation.proof)}</span></li>`).join('')}</ul></section>`;
  }

  function openDocumented(type, code) {
    const item = extension.find(catalog, type, code);
    if (!item) return;
    const isGate = type === 'gate';
    const linked = isGate ? item.relations.map(relation => relation.stand).join(', ') : relationGates(item).join(', ');
    const status = linked ? { label: 'Correspondance sourcée', detail: 'La relation affichée provient d’une source citée ci-dessous.' } :
      isGate ? { label: 'Parking à confirmer', detail: 'La porte est documentée par une source publique. Aucun parking ne lui est attribué tant qu’il n’est pas confirmé.' } :
      { label: 'Porte à confirmer', detail: 'Le parking (poste avion) est documenté par des sources publiques. Aucune porte ne lui est attribuée tant qu’elle n’est pas confirmée.' };
    state.detail = { type, kinds: [isGate ? 'stand' : 'gate', 'correct'], code: item.code, gates: isGate ? '' : linked,
      terminal: extension.terminalText(item).replace(/^Terminal /, ''), status: status.label, draftCode: isGate ? `PORTE-${item.code}` : item.code };
    $('detailTitle').textContent = isGate ? 'Porte documentée' : 'Parking documenté';
    const pendingSide = text => `<span class="point-code ${linked ? 'gate-code' : 'gate-pending'}">${escapeHtml(linked || text)}</span>`;
    $('detailBody').innerHTML = `<div class="detail-codes${linked ? '' : ' is-pending'}"><div><span class="code-label">Parking</span>${isGate ? pendingSide('À confirmer') : `<span class="point-code">${escapeHtml(item.code)}</span>`}</div><span class="direction" aria-hidden="true">↔</span><div><span class="code-label">Porte</span>${isGate ? `<span class="point-code gate-code">${escapeHtml(item.code)}</span>` : pendingSide('À confirmer')}</div></div>
      <dl class="detail-list"><div><dt>Terminal</dt><dd>${escapeHtml(item.certain ? item.terminal : `À confirmer (secteur ${item.sector})`)}</dd></div>
      ${isGate ? `<div><dt>Niveau (plan)</dt><dd>${escapeHtml(item.level)}</dd></div>` : `<div><dt>Point INS (eAIP)</dt><dd>${escapeHtml(item.ins)}</dd></div>`}</dl>
      ${isGate ? '<p class="verification-note">Fiche « Porte d’embarquement » du plan Paris Aéroport. Le plan n’indique pas les parkings desservis.</p>' : `<p class="verification-note">${escapeHtml(item.basis)}${item.note ? ' ' + escapeHtml(item.note) : ''}</p>`}
      ${relationsHtml(item)}${verificationHtml(status, { label: 'Non documentées' })}${sourcesHtml(item)}
      <div class="detail-actions"><button type="button" class="secondary-button" data-copy="${escapeHtml(item.code)}">Copier ${isGate ? 'la porte' : 'le parking'}</button></div>
      ${contributeHtml(state.detail.kinds)}`;
    $('detailDialog').showModal();
  }

  /* ---------- Contribution ---------- */
  const contributionForm = $('contributionForm');

  function today() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function formValues() {
    const data = new FormData(contributionForm);
    return Object.fromEntries(contributions.FIELDS.map(field => [field, String(data.get(field) || '').trim()]));
  }

  function showDraftStatus(draft, saved) {
    if (!draft) { $('draftStatus').textContent = 'Aucun brouillon pour cette fiche.'; return; }
    const time = new Date(draft.updatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    $('draftStatus').textContent = saved ? `Brouillon enregistré sur cet appareil · ${time}. Non transmis.` :
      'Brouillon non enregistré : le stockage de cet appareil est indisponible. Copiez le message avant de fermer.';
  }

  function syncOriginDetail() {
    const origin = $('contribOrigin').value;
    $('originDetailField').hidden = !['document', 'colleague'].includes(origin);
    $('originDetailLabel').textContent = origin === 'colleague' ? 'Fonction du collègue' : 'Nom et date du document';
  }

  function openContribution(kind) {
    const detail = state.detail;
    if (!detail || !contributions.KINDS[kind]) return;
    state.contribution = { kind, ...detail };
    contributionForm.reset();
    resetFieldStates();
    $('contributionTitle').textContent = contributions.KINDS[kind].title;
    $('contributionContext').innerHTML = (detail.type === 'gate' ? `<div><dt>Porte</dt><dd>${escapeHtml(detail.code)}</dd></div><div><dt>Parking affiché</dt><dd>À confirmer</dd></div>` :
      `<div><dt>Parking</dt><dd>${escapeHtml(detail.code)}</dd></div><div><dt>Porte${detail.gates.includes(',') ? 's' : ''} affichée${detail.gates.includes(',') ? 's' : ''}</dt><dd>${escapeHtml(detail.gates || 'À confirmer')}</dd></div>`) + `
      <div><dt>Terminal</dt><dd>${escapeHtml(detail.terminal)}</dd></div><div><dt>État affiché</dt><dd>${escapeHtml(detail.status)}</dd></div>`;
    const confirming = kind === 'confirm';
    $('confirmStatement').hidden = !confirming;
    $('confirmStatement').textContent = confirming ? `Vous confirmez : parking ${detail.code} → porte${detail.gates.includes(',') ? 's' : ''} ${detail.gates}.` : '';
    $('answerField').hidden = confirming;
    $('contribAnswer').disabled = confirming;
    $('answerLabel').textContent = kind === 'gate' ? 'Porte utilisée' : kind === 'stand' ? 'Parking desservi' : 'Correction proposée';
    $('answerHint').textContent = kind === 'gate' ? 'La porte réellement utilisée pour ce parking, par exemple B22.' :
      kind === 'stand' ? 'Le parking réellement desservi par cette porte, par exemple A10.' : 'La valeur correcte, par exemple une autre porte ou un autre terminal.';
    $('contribDate').max = today();
    const draft = drafts.get(kind, detail.draftCode || detail.code);
    if (draft) {
      for (const field of contributions.FIELDS) {
        const control = contributionForm.elements[field];
        if (!control || draft[field] === undefined) continue;
        if (control instanceof RadioNodeList) { for (const radio of control) radio.checked = radio.value === draft[field]; }
        else control.value = draft[field];
      }
    } else if (kind === 'correct') {
      $('contribAnswer').value = detail.gates;
    }
    syncOriginDetail();
    showDraftStatus(draft, drafts.isSaved());
    $('contributionOutcome').textContent = '';
    $('messagePreview').textContent = '';
    $('messagePreviewBox').hidden = true;
    $('messagePreviewBox').open = false;
    $('contributionDialog').showModal();
    $('contributionDialog').scrollTop = 0;
    // Le premier champ à remplir reçoit le focus, pas le bouton de fermeture.
    (confirming ? $('contribDate') : $('contribAnswer')).focus({ preventScroll: true });
  }

  function saveDraft() {
    const current = state.contribution;
    if (!current) return;
    const result = drafts.save(current.kind, current.draftCode || current.code, formValues());
    showDraftStatus(result.draft, result.saved);
  }

  function currentMessage() {
    const current = state.contribution;
    return contributions.buildMessage(current.kind, current, formValues());
  }

  // Erreurs : aria-invalid suit l'état visuel :user-invalid, le message n'est relié au
  // champ que lorsqu'il est affiché, et une seule région polie l'annonce.
  const announcer = Object.assign(document.createElement('div'), { className: 'visually-hidden' });
  announcer.setAttribute('aria-live', 'polite');
  document.body.append(announcer);
  let announceTimer;
  const userInvalidSupported = CSS.supports('selector(:user-invalid)');
  const touched = new WeakSet();

  function isUserInvalid(field) {
    if (userInvalidSupported) return field.matches(':user-invalid');
    return touched.has(field) && !field.validity.valid;
  }

  function linkError(field, shown) {
    const errorId = field.dataset.error;
    if (!errorId) return;
    const ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== errorId);
    if (shown) ids.push(errorId);
    if (ids.length) field.setAttribute('aria-describedby', ids.join(' ')); else field.removeAttribute('aria-describedby');
  }

  function syncField(field, announce = false) {
    if (!field.matches?.('input, select, textarea') || !field.dataset.error) return;
    const invalid = isUserInvalid(field);
    const wasInvalid = field.getAttribute('aria-invalid') === 'true';
    field.setAttribute('aria-invalid', String(invalid));
    field.classList.toggle('user-invalid-fallback', !userInvalidSupported && invalid);
    linkError(field, invalid);
    field.closest('.field')?.classList.toggle('has-error', [...(field.closest('.field')?.querySelectorAll('[data-error]') || [])].some(isUserInvalid));
    if (invalid && announce && !wasInvalid) {
      clearTimeout(announceTimer);
      announcer.textContent = '';
      const message = $(field.dataset.error)?.textContent || '';
      announceTimer = setTimeout(() => { announcer.textContent = message; }, 500);
    }
  }

  function resetFieldStates() {
    for (const field of contributionForm.querySelectorAll('[data-error]')) {
      field.setAttribute('aria-invalid', 'false');
      field.classList.remove('user-invalid-fallback');
      linkError(field, false);
    }
    for (const group of contributionForm.querySelectorAll('.has-error')) group.classList.remove('has-error');
  }

  contributionForm.addEventListener('blur', event => { touched.add(event.target); syncField(event.target, true); }, true);
  contributionForm.addEventListener('change', event => { touched.add(event.target); syncField(event.target, true); });
  contributionForm.addEventListener('invalid', event => {
    touched.add(event.target);
    // Toutes les radios d'un groupe partagent l'erreur.
    for (const field of contributionForm.querySelectorAll(`[name="${event.target.name}"]`)) { touched.add(field); syncField(field); }
  }, true);
  contributionForm.addEventListener('input', event => {
    if (event.target.getAttribute('aria-invalid') === 'true') syncField(event.target);
    // Enregistrement immédiat : un rechargement ou une coupure ne perd aucune frappe.
    saveDraft();
  });
  contributionForm.addEventListener('change', event => {
    if (event.target.name === 'origin') syncOriginDetail();
    if (event.target.type === 'radio') for (const radio of contributionForm.querySelectorAll(`[name="${event.target.name}"]`)) syncField(radio);
    saveDraft();
  });
  contributionForm.addEventListener('submit', async event => {
    event.preventDefault();
    saveDraft();
    const message = currentMessage();
    const text = `${message.subject}\n\n${message.body}`;
    $('messagePreview').textContent = text;
    $('messagePreviewBox').hidden = false;
    if (event.submitter?.value === 'mail') {
      window.location.href = contributions.mailtoHref(reportRecipient, message);
      $('contributionOutcome').textContent = 'Votre messagerie devrait s’ouvrir avec le message prérempli. Rien n’est transmis tant que vous ne l’envoyez pas vous-même. Le brouillon reste sur cet appareil.';
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      $('contributionOutcome').textContent = 'Message copié. Collez-le dans le canal de votre choix : il n’est pas encore transmis. Le brouillon reste sur cet appareil.';
    } catch (_) {
      $('contributionOutcome').textContent = 'Copie impossible sur cet appareil. Le message est affiché ci-dessous : sélectionnez-le pour le copier.';
      $('messagePreviewBox').open = true;
    }
  });
  $('discardDraftButton').addEventListener('click', () => {
    const current = state.contribution;
    if (!current) return;
    const saved = drafts.remove(current.kind, current.draftCode || current.code);
    contributionForm.reset();
    resetFieldStates();
    if (current.kind === 'correct') $('contribAnswer').value = current.gates;
    syncOriginDetail();
    $('messagePreviewBox').hidden = true;
    $('contributionOutcome').textContent = '';
    $('draftStatus').textContent = saved ? 'Brouillon effacé de cet appareil.' : 'Brouillon effacé pour cette session.';
  });
  $('contributionDialog').addEventListener('close', () => { if (state.contribution) saveDraftIfFilled(); });

  function saveDraftIfFilled() {
    const values = formValues();
    const current = state.contribution;
    const prefilled = current.kind === 'correct' ? current.gates : '';
    const filled = contributions.FIELDS.some(field => values[field] && !(field === 'answer' && values[field] === prefilled));
    if (filled) saveDraft();
  }

  function openShareInfo() {
    $('infoTitle').textContent = 'Partager l’application';
    $('infoBody').innerHTML = `<div class="info-content"><div class="share-qr"><img src="${new URL('assets/qr-cdg-parking.png', appBase).href}" width="392" height="392" alt="QR code original pour accéder à CDG Parking"></div><p class="share-caption">Scannez ce QR code pour accéder à l’app</p>
      <div class="install-guide"><h3>Installer comme une app</h3>
      <h4>iPhone / iPad (Safari)</h4><ol><li>Ouvrez le site dans Safari.</li><li>Touchez Partager, puis « Sur l’écran d’accueil ».</li><li>Nommez l’application « CDG Parking », puis touchez Ajouter.</li></ol>
      <h4>Android (Chrome)</h4><ol><li>Ouvrez le site dans Chrome.</li><li>Dans le menu, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».</li><li>Validez l’installation ou l’ajout du raccourci.</li></ol></div>
      <h3>Même sans réseau</h3><p>Lors de la première ouverture en ligne, attendez le message « Disponible hors connexion ». Les parkings, portes et codes IATA seront ensuite accessibles sans Internet, tant que votre appareil conserve les données du site.</p>
      <button type="button" class="secondary-button" data-copy="${escapeHtml(shareUrl)}">Copier le lien de l’application</button></div>`;
    $('infoDialog').showModal();
    $('infoDialog').scrollTop = 0;
  }

  async function openDataInfo() {
    $('infoTitle').textContent = 'À propos des données';
    $('infoBody').innerHTML = `<div class="info-content"><h3>Parkings & portes</h3><p>Les ${mappings.length} correspondances de l’antisèche d’origine ont été conservées. Les accès rampe, ascenseur et les emplacements au large sont affichés lorsqu’ils sont renseignés.</p><p>Chaque fiche indique son état de vérification. « Validée par le responsable » reprend une déclaration du responsable de l’application ; « Vérification à documenter » signifie seulement qu’aucune source n’est encore enregistrée.</p><p>Terminaux 2A à 2D : les parkings (postes avion) viennent de l’eAIP (AD 2 LFPG, carte APDC 01) et les portes du plan Paris Aéroport. Ils ne font pas partie des correspondances. Sans relation sourcée, la porte ou le parking reste à confirmer, et le rattachement au terminal est signalé lorsqu’il est incertain. Depuis une fiche, vous pouvez préparer une confirmation ou une correction : elle ne modifie pas les données.</p>
      <h3>Répertoire IATA</h3><p id="iataSourceInfo">Aéroports : OurAirports. Villes et regroupements : Travelpayouts. Ce répertoire public est une aide à la recherche ; il ne constitue pas le registre officiel exhaustif IATA.</p>
      <p><a href="https://ourairports.com/data/" target="_blank" rel="noopener noreferrer">OurAirports</a> · <a href="https://api.travelpayouts.com/data/fr/cities.json" target="_blank" rel="noopener noreferrer">Données de villes</a></p></div>`;
    $('infoDialog').showModal();
    try {
      const data = await loadIata();
      const sourceInfo = $('iataSourceInfo');
      if (sourceInfo) sourceInfo.textContent = `${data.locations.length.toLocaleString('fr-FR')} entrées, copie du ${new Date(data.updatedAt).toLocaleDateString('fr-FR', { timeZone: 'Australia/Sydney' })}. Aéroports : OurAirports. Villes et regroupements : Travelpayouts. Cette base publique ne constitue pas le registre officiel exhaustif IATA.`;
    } catch (_) { /* The source explanation remains available offline. */ }
  }

  function updateOfflineStatus() {
    const offline = !navigator.onLine;
    $('offlineStatus').classList.toggle('ready', state.offlineReady);
    $('offlineStatus').textContent = state.offlineReady ? (offline ? 'Hors connexion · données disponibles' : 'Disponible hors connexion') :
      offline ? 'Hors connexion · enregistrement local non confirmé' : 'Préparation de l’accès hors connexion…';
  }

  async function registerOffline() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) {
      $('offlineStatus').textContent = 'Accès hors connexion : ouvrez le site avec un lien HTTPS.';
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register(new URL('sw.js', appBase), { scope: appBase.href });
      const offerUpdate = () => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          state.waitingWorker = registration.waiting;
          $('updateButton').hidden = false;
        }
      };
      const watchInstaller = worker => {
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') offerUpdate();
          if (worker.state === 'redundant' && !registration.active) $('offlineStatus').textContent = 'Enregistrement hors connexion incomplet · réessayez en ligne.';
        });
      };
      offerUpdate();
      watchInstaller(registration.installing);
      registration.addEventListener('updatefound', () => watchInstaller(registration.installing));
      navigator.serviceWorker.ready.then(() => { state.offlineReady = true; updateOfflineStatus(); });
      let reloadForUpdate = false;
      $('updateButton').addEventListener('click', () => {
        if (!state.waitingWorker) return;
        reloadForUpdate = true;
        state.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloadForUpdate) window.location.reload(); });
    } catch (_) { $('offlineStatus').textContent = 'Enregistrement hors connexion indisponible · réessayez en ligne.'; }
  }

  $('searchInput').addEventListener('input', () => {
    clearTimeout(historyTimer);
    state.limit = 40;
    render();
    historyTimer = setTimeout(() => rememberCurrentSearch(), 600);
  });
  $('searchInput').addEventListener('keydown', event => {
    if (event.key === 'Enter') { clearTimeout(historyTimer); rememberCurrentSearch(true); event.currentTarget.blur(); }
  });
  $('searchInput').addEventListener('blur', () => rememberCurrentSearch(true));
  $('clearButton').addEventListener('click', () => { clearTimeout(historyTimer); rememberCurrentSearch(true); $('searchInput').value = ''; state.limit = 40; render(); $('searchInput').focus(); });
  for (const tab of document.querySelectorAll('[data-mode]')) {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
    tab.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        setMode(state.mode === 'parking' ? 'iata' : 'parking');
        $(state.mode === 'parking' ? 'parkingTab' : 'iataTab').focus();
      }
    });
  }
  for (const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    for (const item of document.querySelectorAll('[data-filter]')) {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-pressed', String(selected));
    }
    render();
  });
  $('filterMoreButton').addEventListener('click', () => { state.additionalFilters = !state.additionalFilters; render(); });
  $('results').addEventListener('click', event => {
    const favorite = event.target.closest('[data-favorite-mode]');
    if (favorite) { toggleFavorite(favorite); return; }
    const parking = event.target.closest('[data-parking]');
    const iata = event.target.closest('[data-iata]');
    if (parking) { rememberCurrentSearch(true); openDetail(parking.dataset.parking); }
    const documented = event.target.closest('[data-documented]');
    if (documented) { rememberCurrentSearch(true); openDocumented(documented.dataset.documented, documented.dataset.code); }
    if (iata) { clearTimeout(historyTimer); rememberCurrentSearch(true); $('searchInput').value = iata.dataset.iata; state.limit = 40; render(); rememberCurrentSearch(); }
  });
  $('quickAccess').addEventListener('click', event => {
    const remove = event.target.closest('[data-remove-mode]');
    if (remove) {
      const saved = preferences.removeFavorite({ mode: remove.dataset.removeMode, query: remove.dataset.removeQuery });
      renderShortcuts();
      syncFavoriteButtons();
      showToast('Favori retiré' + (saved ? '' : ' pour cette session seulement'));
      return;
    }
    const shortcut = event.target.closest('[data-shortcut-mode]');
    if (!shortcut) return;
    clearTimeout(historyTimer);
    const mode = shortcut.dataset.shortcutMode;
    const query = shortcut.dataset.shortcutQuery;
    if (mode === 'parking') {
      state.filter = 'all';
      state.additionalFilters = false;
      for (const filter of document.querySelectorAll('[data-filter]')) {
        const selected = filter.dataset.filter === 'all';
        filter.classList.toggle('active', selected);
        filter.setAttribute('aria-pressed', String(selected));
      }
    }
    setMode(mode);
    $('searchInput').value = query;
    state.limit = 40;
    render();
    rememberCurrentSearch(true);
    window.scrollTo({ top: 0 });
    if (mode === 'parking' && shortcut.dataset.shortcutKind === 'favorite') openDetail(query);
  });
  $('clearHistoryButton').addEventListener('click', () => {
    clearTimeout(historyTimer);
    const saved = preferences.clearHistory();
    renderShortcuts();
    showToast('Historique effacé' + (saved ? '' : ' pour cette session seulement'));
  });
  $('showMoreButton').addEventListener('click', () => { state.limit += 40; render(); });
  $('shareButton').addEventListener('click', openShareInfo);
  $('dataInfoButton').addEventListener('click', openDataInfo);
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('click', event => {
      const favorite = event.target.closest('[data-favorite-mode]');
      if (favorite) { toggleFavorite(favorite); return; }
      if (event.target.closest('[data-close]')) dialog.close();
      const contribute = event.target.closest('[data-contribute]');
      if (contribute) { openContribution(contribute.dataset.contribute); return; }
      const copyButton = event.target.closest('[data-copy]');
      if (copyButton) copy(copyButton.dataset.copy);
      if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      }
    });
  }
  window.addEventListener('online', updateOfflineStatus);
  window.addEventListener('offline', updateOfflineStatus);
  window.addEventListener('storage', event => {
    if (event.key === preferences.key || event.key === null) { preferences.reload(); renderShortcuts(); syncFavoriteButtons(); }
  });
  render();
  registerOffline();
})();
