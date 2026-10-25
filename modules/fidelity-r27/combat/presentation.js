/* Exact generated base poses for selection portraits; no actor selection writes. */
(function (root) {
  'use strict';
  const sprites = root.RE_COMBAT_SPRITES_R27;
  const doc = root.document;
  if (!sprites || !doc || typeof root.MutationObserver !== 'function' || root.RE_COMBAT_SPRITE_PRESENTATION_R27) return;
  const bindings = ['p1Portrait', 'p2Portrait'].map(id => doc.getElementById(id)).filter(Boolean).map(canvas => ({
    canvas, host: canvas.closest('.portrait'), image: null, token: 0, signature: '', displayed: '', status: 'original'
  })).filter(binding => binding.host);
  if (!bindings.length) return;
  const style = doc.createElement('style');
  style.textContent = '.portrait.r27-sprite-host{position:relative}.r27-sprite-presentation{position:absolute;inset:3%;width:94%;height:94%;object-fit:contain;object-position:center bottom;z-index:1;pointer-events:none}.r27-sprite-presentation[hidden]{display:none!important}.portrait.r27-sprite-active>canvas{visibility:hidden}.portrait.r27-sprite-active>.slot-tag{z-index:2}';
  doc.head.append(style);
  let active = true, disposed = false;
  function original(binding, state = 'original') {
    binding.host.classList.remove('r27-sprite-active');
    if (binding.image) {
      binding.image.onload = binding.image.onerror = null; binding.image.hidden = true;
      binding.image.removeAttribute('src');
    }
    binding.displayed = ''; binding.status = state;
  }
  function update(binding) {
    if (!active || disposed) return;
    const id = binding.canvas.dataset.reSpecimen || '', record = sprites.get(id);
    const signature = id + ':' + (record?.sha256 || 'missing');
    if (signature === binding.signature) return;
    binding.signature = signature;
    const token = ++binding.token;
    // R20 keeps its own four-pose selection adapter and original API.
    original(binding);
    if (!record || record.origin === 'R20' || record.reviewStatus !== 'visually-reviewed' || record.fullBodyReviewed !== true) return;
    binding.status = 'loading';
    if (!binding.image) {
      binding.image = doc.createElement('img'); binding.image.className = 'r27-sprite-presentation';
      binding.image.alt = ''; binding.image.hidden = true; binding.image.draggable = false;
      binding.image.setAttribute('aria-hidden', 'true');
      binding.host.classList.add('r27-sprite-host'); binding.host.append(binding.image);
    }
    const current = () => !disposed && active && token === binding.token && binding.canvas.dataset.reSpecimen === id;
    sprites.load(id).then(resource => {
      if (!current()) return;
      const image = binding.image;
      const show = () => {
        if (!current() || image.naturalWidth !== record.width || image.naturalHeight !== record.height) return;
        image.hidden = false; image.dataset.spriteId = id; binding.host.classList.add('r27-sprite-active');
        binding.displayed = id; binding.status = 'ready';
      };
      image.onload = show; image.onerror = () => { if (current()) original(binding, 'error'); };
      image.src = resource.image.src;
      if (image.complete && image.naturalWidth) show();
    }).catch(() => { if (current()) original(binding, 'error'); });
  }
  const observer = new root.MutationObserver(changes => {
    for (const binding of bindings) if (changes.some(change => change.target === binding.canvas)) update(binding);
  });
  function sync() { for (const binding of bindings) update(binding); }
  function connect() {
    if (disposed) return;
    active = true;
    for (const binding of bindings) { observer.observe(binding.canvas, { attributes: true, attributeFilter: ['data-re-specimen'] }); binding.signature = ''; }
    sync();
  }
  function disconnect() {
    active = false; observer.disconnect();
    for (const binding of bindings) { binding.token++; binding.signature = ''; original(binding); }
  }
  sprites.ready().then(sync);
  root.addEventListener('re:r27spritestatus', sync);
  root.addEventListener('pagehide', disconnect); root.addEventListener('pageshow', connect);
  root.RE_COMBAT_SPRITE_PRESENTATION_R27 = Object.freeze({
    sync() { for (const binding of bindings) binding.signature = ''; sync(); },
    state: () => ({ active, disposed, slots: bindings.map(binding => ({ slot: binding.canvas.id,
      id: binding.canvas.dataset.reSpecimen || '', displayed: binding.displayed, status: binding.status })) }),
    destroy() {
      if (disposed) return; disconnect(); disposed = true;
      root.removeEventListener('re:r27spritestatus', sync); root.removeEventListener('pagehide', disconnect); root.removeEventListener('pageshow', connect);
      for (const binding of bindings) { binding.image?.remove(); binding.host.classList.remove('r27-sprite-host'); }
      style.remove();
    }
  });
  connect();
})(globalThis);
