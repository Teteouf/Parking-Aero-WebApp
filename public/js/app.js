(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const { searchParking, prepareLocations, searchLocations, pointCode, normalize } = window.ParkingCore;
  const mappings = window.PARKING_MAPPINGS;
  const appBase = new URL('./', document.baseURI);
  const shareUrl = 'https://teteouf.github.io/Parking-Aero-WebApp/';
  let deviceStorage;
  try { deviceStorage = window.localStorage; } catch (_) { /* Session-only fallback. */ }
  const preferences = window.ParkingPreferences.createPreferences(deviceStorage, 'cdg-parking.preferences.v1:' + appBase.pathname);
  const state = { mode: 'parking', filter: 'all', additionalFilters: false, queries: { parking: '', iata: '' }, locations: null,
    iataData: null, iataPromise: null, limit: 40, offlineReady: false, waitingWorker: null };
  let toastTimer;
  let historyTimer;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function badgeHtml(mapping) {
    return (mapping.offsite ? '<span class="badge offsite">Au large</span>' : '') +
      (mapping.ramp ? '<span class="badge access">Rampe</span>' : '') +
      (mapping.elevator ? '<span class="badge access">Ascenseur</span>' : '');
  }

  function mappingHtml(mapping) {
    return `<article class="mapping-card"><button type="button" class="mapping-open" data-parking="${escapeHtml(mapping.parkingCode)}" aria-label="Parking ${escapeHtml(mapping.parkingCode)}, porte${mapping.gates.length > 1 ? 's' : ''} ${escapeHtml(mapping.gates.join(', '))}, détails">
      <span class="mapping-line"><span><span class="code-label">Parking</span><span class="point-code">${escapeHtml(mapping.parkingCode)}</span></span>
      <span class="direction" aria-hidden="true">↔</span><span><span class="code-label">Porte${mapping.gates.length > 1 ? 's' : ''}</span><span class="point-code gate-code">${escapeHtml(mapping.gates.join(', '))}</span></span></span>
      <span class="mapping-meta">Terminal ${escapeHtml(mapping.terminal)} - Porte ${escapeHtml(mapping.section)}</span>
      ${mapping.offsite || mapping.ramp || mapping.elevator ? `<span class="badges">${badgeHtml(mapping)}</span>` : ''}</button>${favoriteButton({ mode: 'parking', query: mapping.parkingCode }, 'la correspondance ' + mapping.parkingCode)}</article>`;
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
      matches = searchParking(mappings, query, state.filter);
      exact = matches.some(m => pointCode(m.parkingCode) === pointCode(query) || m.gates.some(gate => pointCode(gate) === pointCode(query)));
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
    const secondaryFilter = ['1', 'access'].includes(state.filter);
    $('additionalFilters').hidden = !state.additionalFilters;
    $('filterMoreButton').textContent = (state.additionalFilters ? 'Moins' : 'Plus') + (secondaryFilter ? ' · 1' : '');
    $('filterMoreButton').classList.toggle('active', secondaryFilter);
    $('filterMoreButton').setAttribute('aria-expanded', String(state.additionalFilters));
    $('filterMoreButton').setAttribute('aria-label', (state.additionalFilters ? 'Masquer' : 'Afficher') + ' les autres filtres' + (secondaryFilter ? ', un filtre actif' : ''));
    const filterLabels = { '2E': 'Terminal 2E', '2F': 'Terminal 2F', '2G': 'Terminal 2G', '1': 'Terminal 1', access: 'Rampe / ascenseur' };
    $('searchHint').textContent = state.mode === 'iata' ? 'Aéroports & villes' : filterLabels[state.filter] || 'Parking ↔ porte';
    if (state.mode === 'parking') {
      const matches = searchParking(mappings, query, state.filter);
      $('resultsCount').textContent = query || state.filter !== 'all' ? `${matches.length} correspondance${matches.length === 1 ? '' : 's'}` : `${mappings.length} points de parking`;
      $('results').innerHTML = matches.length ? matches.map(mappingHtml).join('') : emptyHtml('Aucune correspondance', 'Essayez un autre code ou changez le filtre de terminal.');
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

  function openDetail(code) {
    const mapping = mappings.find(item => item.parkingCode === code);
    if (!mapping) return;
    const subject = encodeURIComponent(`[CDG Parking] Signalement — ${mapping.parkingCode} → ${mapping.gates.join(', ')}`);
    const body = encodeURIComponent(`Bonjour,\n\nParking : ${mapping.parkingCode}\nPorte(s) : ${mapping.gates.join(', ')}\nTerminal : ${mapping.terminal} - Porte : ${mapping.section}\n\nCorrection / remarque :\n[À compléter]\n\nMerci !`);
    $('detailBody').innerHTML = `<div class="detail-codes"><div><span class="code-label">Parking</span><span class="point-code">${escapeHtml(mapping.parkingCode)}</span></div><span class="direction" aria-hidden="true">↔</span><div><span class="code-label">Porte${mapping.gates.length > 1 ? 's' : ''}</span><span class="point-code gate-code">${escapeHtml(mapping.gates.join(', '))}</span></div></div>
      <dl class="detail-list"><div><dt>Terminal</dt><dd>${escapeHtml(mapping.terminal)}</dd></div><div><dt>Porte</dt><dd>${escapeHtml(mapping.section)}</dd></div>
      ${mapping.offsite ? '<div><dt>Emplacement</dt><dd>Au large</dd></div>' : ''}${mapping.ramp ? '<div><dt>Accès</dt><dd>Rampe</dd></div>' : ''}${mapping.elevator ? '<div><dt>Accès</dt><dd>Ascenseur</dd></div>' : ''}</dl>
      <div class="detail-actions">${favoriteButton({ mode: 'parking', query: mapping.parkingCode }, 'la correspondance ' + mapping.parkingCode, true)}<button type="button" class="primary-button" data-copy="${escapeHtml(mapping.gates.join(', '))}">Copier ${mapping.gates.length > 1 ? 'les portes' : 'la porte'}</button><button type="button" class="secondary-button" data-copy="${escapeHtml(mapping.parkingCode)}">Copier le parking</button></div>
      <a class="report-link" href="mailto:dargos.theo@hotmail.fr?subject=${subject}&body=${body}">Signaler une erreur</a>`;
    $('detailDialog').showModal();
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
    $('infoBody').innerHTML = `<div class="info-content"><h3>Parkings & portes</h3><p>Les ${mappings.length} correspondances de l’antisèche d’origine ont été conservées. Les accès rampe, ascenseur et les emplacements au large sont affichés lorsqu’ils sont renseignés. Signalez toute modification depuis la fiche concernée.</p>
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
