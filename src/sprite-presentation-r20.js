(function (root) {
  'use strict';
  const library = root.BOWSpritesR20;
  if (!library || typeof root.MutationObserver !== 'function' || root.RE_SPRITE_PRESENTATION_R20) return;
  const document = root.document;
  const bindings = ['p1Portrait', 'p2Portrait'].map(id => document.getElementById(id)).filter(Boolean).map(canvas => ({
    canvas, host: canvas.closest('.portrait'), image: null, token: 0, requested: '', displayed: '', status: 'original'
  })).filter(binding => binding.host);
  if (!bindings.length) return;
  const style = document.createElement('style');
  style.textContent = '.portrait.r20-sprite-host{position:relative}.r20-sprite-presentation{position:absolute;inset:3%;width:94%;height:94%;object-fit:contain;object-position:center bottom;z-index:1;pointer-events:none}.r20-sprite-presentation[hidden]{display:none!important}.portrait.r20-sprite-active>canvas{visibility:hidden}.portrait.r20-sprite-active>.slot-tag{z-index:2}';
  document.head.append(style);
  let connected = false, disposed = false;
  function original(binding, state = 'original') {
    binding.host.classList.remove('r20-sprite-active');
    if (binding.image) { binding.image.onload = null; binding.image.onerror = null; binding.image.hidden = true; binding.image.removeAttribute('src'); }
    binding.displayed = '';
    binding.status = state;
  }
  function update(binding) {
    const id = binding.canvas.dataset.reSpecimen || '';
    if (disposed || !connected || binding.requested === id) return;
    binding.requested = id;
    const token = ++binding.token, record = library.get(id);
    original(binding, record ? 'loading' : 'original');
    if (!record) return;
    if (!binding.image) {
      binding.image = document.createElement('img');
      binding.image.className = 'r20-sprite-presentation';
      binding.image.hidden = true;
      binding.image.alt = '';
      binding.image.setAttribute('aria-hidden', 'true');
      binding.image.draggable = false;
      binding.host.classList.add('r20-sprite-host');
      binding.host.append(binding.image);
    }
    const current = () => !disposed && connected && binding.token === token && binding.canvas.dataset.reSpecimen === id;
    library.load(id).then(() => {
      if (!current()) return;
      const image = binding.image;
      const show = () => {
        if (!current() || image.naturalWidth !== record.width || image.naturalHeight !== record.height) return;
        image.hidden = false;
        image.dataset.spriteId = id;
        binding.host.classList.add('r20-sprite-active');
        binding.displayed = id;
        binding.status = 'ready';
      };
      image.onload = show;
      image.onerror = () => { if (current()) original(binding, 'error'); };
      image.src = library.url(id);
      if (image.complete && image.naturalWidth) show();
    }).catch(() => { if (current()) original(binding, 'error'); });
  }
  const observer = new root.MutationObserver(records => {
    for (const binding of bindings) if (records.some(record => record.target === binding.canvas)) update(binding);
  });
  function connect() {
    if (connected || disposed) return;
    connected = true;
    for (const binding of bindings) {
      observer.observe(binding.canvas, { attributes: true, attributeFilter: ['data-re-specimen'] });
      binding.requested = '';
      update(binding);
    }
  }
  function disconnect() {
    connected = false;
    observer.disconnect();
    for (const binding of bindings) { binding.token++; binding.requested = ''; original(binding); }
  }
  function destroy() {
    if (disposed) return;
    disconnect(); disposed = true;
    root.removeEventListener('pagehide', disconnect); root.removeEventListener('pageshow', connect);
    for (const binding of bindings) { binding.image?.remove(); binding.host.classList.remove('r20-sprite-host'); }
    style.remove();
  }
  root.addEventListener('pagehide', disconnect);
  root.addEventListener('pageshow', connect);
  root.RE_SPRITE_PRESENTATION_R20 = Object.freeze({
    sync: () => bindings.forEach(update),
    state: () => ({ connected, disposed, slots: bindings.map(binding => ({ slot: binding.canvas.id, requested: binding.requested, displayed: binding.displayed, status: binding.status })) }),
    destroy
  });
  connect();
})(globalThis);
