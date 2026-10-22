(function () {
  'use strict';
  const library = globalThis.BOWSpritesR20;
  const select = document.getElementById('spriteSelect');
  const canvas = document.getElementById('spriteCanvas');
  const context = canvas.getContext('2d');
  const status = document.getElementById('spriteStatus');
  let active = null;
  let generation = 0;
  for (const record of library.list()) {
    const option = document.createElement('option');
    option.value = record.id;
    option.textContent = `${record.label} — ${record.incarnation}`;
    select.append(option);
  }
  function render() {
    if (!active || !context) return;
    const box = canvas.getBoundingClientRect();
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(box.width * ratio));
    canvas.height = Math.max(1, Math.round(box.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const scale = Number(document.getElementById('spriteScale').value) / 100;
    const height = Math.min(box.height * scale, (box.width - 32) * active.bounds.height / active.bounds.width);
    const x = box.width / 2;
    const y = (box.height + height) / 2;
    const result = library.draw(context, active.id, { x, y, height });
    if (!result.ok) { status.textContent = 'Image indisponible : ' + result.reason; return; }
    if (document.getElementById('spritePivot').checked) {
      context.save();
      context.strokeStyle = '#ffbf69';
      context.lineWidth = 1;
      context.setLineDash([4, 4]);
      context.beginPath(); context.moveTo(12, y); context.lineTo(box.width - 12, y); context.stroke();
      context.setLineDash([]);
      context.beginPath(); context.moveTo(x - 7, y); context.lineTo(x + 7, y); context.moveTo(x, y - 7); context.lineTo(x, y + 7); context.stroke();
      context.restore();
    }
  }
  async function choose() {
    const token = ++generation;
    const record = library.get(select.value);
    active = null;
    context?.clearRect(0, 0, canvas.width, canvas.height);
    status.textContent = 'Chargement du sujet…';
    document.getElementById('spriteName').textContent = record.label;
    canvas.setAttribute('aria-label', `${record.label}, ${record.incarnation}, pose de présentation entière.`);
    const metadata = document.getElementById('spriteMetadata');
    metadata.replaceChildren();
    for (const [label, text] of [
      ['Incarnation', record.incarnation], ['Format', `${record.width} × ${record.height} · PNG RGBA`],
      ['Alpha transparent', `${(record.alpha.transparentFraction * 100).toFixed(1)} % des pixels`],
      ['État', 'Idle · 1 image'], ['Vue', 'Trois quarts, orientée à droite'],
      ['Miroir', 'Interdit : vue opposée à produire'], ['Calques', '1 corps entier'],
      ['Fidélité 1:1', 'Revue artistique requise'], ['Empreinte SHA-256', record.sha256]
    ]) {
      const term = document.createElement('dt'); term.textContent = label;
      const value = document.createElement('dd'); value.textContent = text;
      metadata.append(term, value);
    }
    const native = document.getElementById('spriteNative');
    native.href = library.url(record.id); native.download = record.id + '-idle-right.png';
    document.getElementById('spriteManifest').href = `assets/sprites/bow/${record.id}/sprite-manifest.json`;
    const variant = document.getElementById('spriteVariant');
    variant.hidden = !record.variants?.length;
    if (record.variants?.length) variant.href = record.variants[0].image;
    else variant.removeAttribute('href');
    try {
      await library.load(record.id);
      if (token !== generation) return;
      active = record;
      status.textContent = 'Image chargée. Pose unique ; aucun mouvement de combat n’est simulé.';
      render();
    } catch {
      if (token === generation) status.textContent = 'Impossible de charger ce sprite. Choisissez à nouveau le sujet pour réessayer.';
    }
  }
  select.addEventListener('change', choose);
  document.getElementById('spriteBackground').addEventListener('change', event => {
    document.getElementById('spritePreview').dataset.background = event.target.value;
  });
  document.getElementById('spriteScale').addEventListener('input', render);
  document.getElementById('spritePivot').addEventListener('change', render);
  globalThis.addEventListener('resize', render);
  choose();
})();
