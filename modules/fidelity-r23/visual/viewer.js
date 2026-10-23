'use strict';
(() => {
  const status = document.querySelector('#status');
  const container = document.querySelector('#portraits');
  const objectUrls = [];
  const text = (tag, value, parent) => {
    const element = document.createElement(tag);
    element.textContent = value;
    if (parent) parent.append(element);
    return element;
  };
  const digest = async buffer => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), x => x.toString(16).padStart(2, '0')).join('');
  const read = async path => {
    const response = await fetch(path, {cache: 'no-store'});
    if (!response.ok) throw new Error('Une ressource est indisponible.');
    return response;
  };
  const external = (label, href, parent) => {
    const url = new URL(href);
    if (url.protocol !== 'https:') throw new Error('URL de source refusée.');
    const link = text('a', label, parent);
    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  };
  const start = async () => {
    if (!crypto.subtle) throw new Error('La vérification demande HTTPS ou un serveur local.');
    const manifest = await (await read('manifest.json')).json();
    if (manifest.schema !== 're.bow.visual-source-index/1') throw new Error('Format de provenance inconnu.');
    let verified = 0;
    for (const item of manifest.entries) {
      const card = text('article', '', container);
      card.className = 'portrait';
      text('h3', item.name, card);
      text('p', item.id, card).className = 'identity';
      const local = new URL(item.image, location.href);
      const root = new URL('./', location.href);
      if (local.origin !== root.origin || !local.pathname.startsWith(root.pathname + 'portraits/')) throw new Error('Chemin de portrait refusé.');
      const response = await read(local.href);
      const bytes = await response.arrayBuffer();
      if (await digest(bytes) !== item.sha256) throw new Error('Empreinte incorrecte : ' + item.id);
      const url = URL.createObjectURL(new Blob([bytes], {type: 'image/png'}));
      objectUrls.push(url);
      const image = document.createElement('img');
      image.alt = item.visual_review;
      image.width = item.width;
      image.height = item.height;
      image.src = url;
      await image.decode();
      if (image.naturalWidth !== 128 || image.naturalHeight !== 128) throw new Error('Dimensions du portrait incorrectes.');
      card.append(image);
      text('p', item.visual_review, card);
      const limits = text('ul', '', card);
      item.limitations.forEach(limit => text('li', limit, limits));
      external('Comparer avec la fiche Evil Resource', item.secondary_reference.url, card);
      verified += 1;
      status.textContent = `${verified} / ${manifest.entries.length} portraits vérifiés.`;
    }
    for (const item of manifest.exclusions) text('li', `${item.id} — ${item.reason}`, document.querySelector('#excluded'));
    status.textContent = `${verified} portraits vérifiés ; 0 rig et 0 animation de combat finalisés dans ce lot.`;
  };
  start().catch(error => {
    container.replaceChildren();
    status.textContent = 'Affichage interrompu : ' + error.message;
  });
  addEventListener('pagehide', () => objectUrls.forEach(url => URL.revokeObjectURL(url)), {once: true});
})();
