'use strict';
(() => {
  const summary = document.querySelector('#summary');
  const sources = document.querySelector('#sources');
  const body = document.querySelector('#catalogue');
  const search = document.querySelector('#search');
  const results = document.querySelector('#results');
  const text = (tag, value) => {
    const node = document.createElement(tag);
    node.textContent = value;
    return node;
  };
  function link(url, label) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Lien de référence invalide');
    const node = text('a', label);
    node.href = parsed.href;
    node.rel = 'noopener noreferrer';
    return node;
  }
  function render(rows) {
    const query = search.value.trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const shown = rows.filter(row => [row.id, row.name, row.game].join(' ').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().includes(query));
    const fragment = document.createDocumentFragment();
    for (const row of shown) {
      const tr = document.createElement('tr');
      const identity = text('th', row.name);
      identity.scope = 'row';
      identity.append(text('small', row.id));
      const source = document.createElement('td');
      source.append(link(row.source_page, 'Page de référence'));
      tr.append(identity, text('td', row.game), text('td', 'À retrouver et vérifier'), source);
      fragment.append(tr);
    }
    body.replaceChildren(fragment);
    results.textContent = `${shown.length} incarnation${shown.length === 1 ? '' : 's'} affichée${shown.length === 1 ? '' : 's'} sur ${rows.length}.`;
  }
  Promise.all(['manifest.json', 'catalogue.json'].map(async path => {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Relevé indisponible');
    return response.json();
  })).then(([manifest, catalogue]) => {
    if (manifest.schema !== 're.bow.native-audio-status/1' || catalogue.schema !== 're.bow.audio-catalogue/1' || !Array.isArray(catalogue.entries)) throw new Error('Relevé incompatible');
    summary.textContent = `${manifest.counts.catalogue_identities_audited} incarnations, ${manifest.counts.source_documents_hash_verified} pages vérifiées, aucun clip natif intégré.`;
    for (const source of manifest.sources) {
      const row = document.createElement('li');
      row.append(link(source.url, source.url));
      row.append(text('span', source.http_status === 200 ? ' — accessible ; lien vers l’archive de sons repéré.' : source.http_status ? ` — consultation refusée (HTTP ${source.http_status}).` : ' — connexion refusée par le proxy (403).'));
      sources.append(row);
    }
    render(catalogue.entries);
    search.addEventListener('input', () => render(catalogue.entries));
  }).catch(error => {
    summary.textContent = `${error.message}. Le relevé ne peut pas être affiché.`;
    summary.classList.add('error');
  });
})();
