const rootUrl = new URL('../../../', import.meta.url);
const moduleUrl = new URL('./', import.meta.url);
const sourceFiles = ['src/re-data.js', 'src/catalog-expansion-data.js', 'src/catalog-trial-adapter.js', 'src/spatial-weakpoints-v072.js', 'src/combat-foundation-v060.js', 'src/catalog-replay-contract.js', 'src/catalog-replay-r7.js'];

function script(document, url, values = {}) {
  const node = document.createElement('script'); node.src = url;
  for (const [key, value] of Object.entries(values)) node.dataset[key] = value;
  return node;
}
async function documentFor(kind, token, value) {
  let source, selected = {id: 'catalog-current', label: 'Duel expérimental actuel'}, snapshot = null, snapshotBase = null;
  if (kind === 'main') {
    const indexResponse = await fetch(new URL('engines.json', moduleUrl));
    if (!indexResponse.ok) throw Error('Index des moteurs locaux absent.');
    const index = await indexResponse.json();
    if (value.meta.runtimeContract === index.current_main.runtime_contract) selected = index.current_main;
    else {
      selected = index.historical_main.find(engine => engine.runtime_contract === value.meta.runtimeContract);
      if (!selected) throw Error('Contrat de combat inconnu ou absent : utiliser le moteur d’origine.');
      const manifestUrl = new URL(selected.manifest, moduleUrl), manifestResponse = await fetch(manifestUrl);
      if (!manifestResponse.ok) throw Error('Le moteur historique documenté est indisponible.');
      snapshot = await manifestResponse.json(); snapshotBase = new URL('./', manifestUrl);
      if (snapshot.runtime_contract !== value.meta.runtimeContract || snapshot.source_commit !== selected.source_commit) throw Error('Le manifeste historique ne correspond pas au contrat du replay.');
    }
    const response = await fetch(snapshot ? new URL(snapshot.original_html.path, snapshotBase) : new URL('modules/versus.html', rootUrl));
    if (!response.ok) throw Error('Le moteur principal local ne peut pas être chargé.');
    source = await response.text();
  } else source = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Moteur expérimental isolé</title></head><body></body></html>';
  const document = new DOMParser().parseFromString(source, 'text/html');
  if (snapshot) {
    for (const node of document.querySelectorAll('script[src]')) {
      const entry = snapshot.scripts.find(item => item.original_src === node.getAttribute('src'));
      if (!entry) throw Error('Script historique absent du manifeste.');
      node.src = new URL(entry.snapshot_path, snapshotBase).href;
    }
    // This helper supplies bounded envelope validation only. The historical
    // engine retains its own metadata checks, simulation and playback routines.
    document.body.append(script(document, new URL('src/replay-vault-r13.js', rootUrl).href));
  }
  const policy = document.createElement('meta'); policy.httpEquiv = 'Content-Security-Policy';
  const origin = location.origin;
  policy.content = `default-src 'none'; script-src ${origin} 'unsafe-inline'; style-src ${origin} 'unsafe-inline'; img-src ${origin} data: blob:; font-src ${origin}; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri ${origin}`;
  const base = document.createElement('base'); base.href = new URL('modules/versus.html', rootUrl).href;
  const bootstrap = script(document, new URL('bootstrap.js', moduleUrl).href, {kind, token, parentOrigin: origin, rootUrl: rootUrl.href, engineId: selected.id, engineLabel: selected.label, sourceCommit: selected.source_commit || ''});
  document.head.prepend(policy, base, bootstrap);
  if (kind === 'catalog') for (const path of sourceFiles) document.body.append(script(document, new URL(path, rootUrl).href));
  document.body.append(script(document, new URL('verifier.js', moduleUrl).href), script(document, new URL('runner.js', moduleUrl).href));
  return '<!doctype html>\n' + document.documentElement.outerHTML;
}

export async function createVerification(value, options = {}) {
  const kind = value?.schema === 're.bow.catalog-duel-replay/1' ? 'catalog' : value && !Array.isArray(value) && value.meta && Array.isArray(value.frames) ? 'main' : null;
  if (!kind) throw Error('Choisissez un replay principal R13 ou expérimental R7. Pour une archive ou une sauvegarde complète, utilisez l’inspecteur R23.');
  const token = crypto.randomUUID(), html = await documentFor(kind, token, value);
  const frame = document.createElement('iframe'); frame.hidden = true; frame.title = 'Relecture isolée sans stockage partagé'; frame.setAttribute('sandbox', 'allow-scripts'); frame.setAttribute('referrerpolicy', 'no-referrer');
  let finish, timer, settled = false;
  const promise = new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); window.removeEventListener('message', receive); frame.remove(); };
    finish = (error, result) => { if (settled) return; settled = true; cleanup(); error ? reject(error) : resolve(result); };
    const armTimeout = () => { clearTimeout(timer); timer = setTimeout(() => finish(Error('Le moteur ne répond plus. Relecture interrompue sans modifier vos sauvegardes.')), 45000); };
    const receive = event => {
      const data = event.data;
      if (event.source !== frame.contentWindow || event.origin !== 'null' || data?.channel !== 'bow-r24-replay' || data.token !== token) return;
      armTimeout();
      if (data.type === 'ready') {
        if (data.sandbox?.origin !== 'null' || !data.sandbox.isolatedStorage) { finish(Error('L’isolation du moteur n’a pas été confirmée.')); return; }
        frame.contentWindow.postMessage({channel: 'bow-r24-replay', token, type: 'verify', value}, '*');
      } else if (data.type === 'progress') options.onProgress?.(data.detail);
      else if (data.type === 'result') finish(null, data.result);
      else if (data.type === 'error') finish(Error(data.message || 'Relecture refusée par le moteur.'));
    };
    window.addEventListener('message', receive); armTimeout(); frame.srcdoc = html; document.body.append(frame);
  });
  return {promise, cancel: () => finish(Error('Relecture annulée. Aucune sauvegarde modifiée.'))};
}
