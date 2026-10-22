(function (root) {
  'use strict';
  // This registry is rebuilt only from the checked-in manifest, never from combat data.
  const manifest = /* SPRITES_R20_START */ {"schema":"bow-independent-sprites-v1","revision":"R20","purpose":"Independent presentation sprites; no automatic combat replacement.","sprites":[{"id":"re2r-tyrant","label":"Tyrant T-00","incarnation":"Resident Evil 2 remake (2019)","image":"assets/sprites/bow/re2r-tyrant/idle-right.png","width":1024,"height":1536,"format":"PNG","bytes":2031787,"sha256":"141f9f96c5bc0e0bd97ad70edd55ab901fac21dac62cada1f22bff9241ee4a5e","alpha":{"channel":true,"min":0,"max":254,"transparentPixels":967201,"totalPixels":1572864,"transparentFraction":0.61493,"visibleThreshold":16},"bounds":{"x":196,"y":32,"width":682,"height":1473},"pivot":{"x":537,"y":1505},"sourceFacing":"right","view":"three-quarter","canMirror":false,"mirrorReason":"Le manteau et ses attaches sont asymétriques.","availableStates":["idle"],"animationFrames":1,"layers":[{"id":"body","path":"assets/sprites/bow/re2r-tyrant/idle-right.png","order":0,"offset":{"x":0,"y":0}}],"modularParts":false,"combatIntegrated":false,"canonicalFidelity":"review-required","presentation":"menu-and-selection","referenceComparison":"Incarnation contrôlée à partir de la référence locale ; réinterprétation générée, fidélité géométrique 1:1 non certifiée.","openStates":["idle-cycle","walk","run","light","heavy","special","super","hurt","guard","knockdown","intro","victory","defeat","left-view","modular-limbs"],"provenance":{"generator":"image_gen built-in","generationDate":"2026-10-22","generatedSourceFilename":"exec-df5f0a14-de01-4636-a21c-86c3792faf20.png","references":[{"local":"assets/specimens/re2r-tyrant.png","sourcePage":"https://www.evilresource.com/resident-evil-2-remake/enemies/tyrant","role":"incarnation reference"}],"promptFile":"assets/sprites/bow/generation-prompts.json","originalBytesPreserved":true},"integration":{"mainMenu":true,"versusSelection":true,"combatRendering":false,"devViewer":true}},{"id":"re2r-licker","label":"Licker","incarnation":"Resident Evil 2 remake (2019)","image":"assets/sprites/bow/re2r-licker/idle-right.png","width":1536,"height":1024,"format":"PNG","bytes":2327795,"sha256":"9e14e0b63feb3e5b7f8b8a6ea5ca4f1e6d5c97e9c39dceb67b9c2a7dc388f7c7","alpha":{"channel":true,"min":0,"max":254,"transparentPixels":955015,"totalPixels":1572864,"transparentFraction":0.607182,"visibleThreshold":16},"bounds":{"x":14,"y":156,"width":1507,"height":784},"pivot":{"x":768,"y":940},"sourceFacing":"right","view":"three-quarter","canMirror":false,"mirrorReason":"La perspective et la pose doivent être dessinées pour chaque côté.","availableStates":["idle"],"animationFrames":1,"layers":[{"id":"body","path":"assets/sprites/bow/re2r-licker/idle-right.png","order":0,"offset":{"x":0,"y":0}}],"modularParts":false,"combatIntegrated":false,"canonicalFidelity":"review-required","presentation":"menu","referenceComparison":"Incarnation contrôlée à partir de la référence locale ; réinterprétation générée, fidélité géométrique 1:1 non certifiée.","openStates":["idle-cycle","walk","run","light","heavy","special","super","hurt","guard","knockdown","intro","victory","defeat","left-view","modular-limbs"],"provenance":{"generator":"image_gen built-in","generationDate":"2026-10-22","generatedSourceFilename":"exec-ffae650f-24f8-4690-b2f5-95f064165911.png","references":[{"local":"assets/catalog/re2r-licker.png","sourcePage":"https://www.evilresource.com/resident-evil-2-remake/enemies/licker","role":"incarnation reference"}],"promptFile":"assets/sprites/bow/generation-prompts.json","originalBytesPreserved":true},"integration":{"mainMenu":true,"versusSelection":false,"combatRendering":false,"devViewer":true}},{"id":"re1r-hunter","label":"Hunter α","incarnation":"Resident Evil remake (2002)","image":"assets/sprites/bow/re1r-hunter/idle-right.png","width":1254,"height":1254,"format":"PNG","bytes":2093141,"sha256":"54322171f7d86f6a874adb198ecf410f043af56a4b4dcc49520cc39e7d0c7cf9","alpha":{"channel":true,"min":0,"max":255,"transparentPixels":806415,"totalPixels":1572516,"transparentFraction":0.512818,"visibleThreshold":16},"bounds":{"x":46,"y":24,"width":1194,"height":1221},"pivot":{"x":643,"y":1245},"sourceFacing":"right","view":"three-quarter","canMirror":false,"mirrorReason":"La perspective et la pose doivent être dessinées pour chaque côté.","availableStates":["idle"],"animationFrames":1,"layers":[{"id":"body","path":"assets/sprites/bow/re1r-hunter/idle-right.png","order":0,"offset":{"x":0,"y":0}}],"modularParts":false,"combatIntegrated":false,"canonicalFidelity":"review-required","presentation":"menu","referenceComparison":"Incarnation contrôlée à partir de la référence locale ; réinterprétation générée, fidélité géométrique 1:1 non certifiée.","openStates":["idle-cycle","walk","run","light","heavy","special","super","hurt","guard","knockdown","intro","victory","defeat","left-view","modular-limbs"],"provenance":{"generator":"image_gen built-in","generationDate":"2026-10-22","generatedSourceFilename":"exec-88260827-573c-4041-aec8-e0cde7830c27.png","references":[{"local":"assets/catalog/re1r-hunter.png","sourcePage":"https://www.evilresource.com/resident-evil-remake/enemies/hunter","role":"incarnation reference"}],"promptFile":"assets/sprites/bow/generation-prompts.json","originalBytesPreserved":true},"integration":{"mainMenu":true,"versusSelection":false,"combatRendering":false,"devViewer":true}},{"id":"re3r-nemesis","label":"Nemesis — stade 1","incarnation":"Resident Evil 3 remake (2020)","image":"assets/sprites/bow/re3r-nemesis/idle-right-armed.png","width":1024,"height":1536,"format":"PNG","bytes":2734760,"sha256":"0a437afaea6ca7c37b76541fc403a6cd9041d18d1cdd31445077fa17203c0679","alpha":{"channel":true,"min":0,"max":254,"transparentPixels":755056,"totalPixels":1572864,"transparentFraction":0.480052,"visibleThreshold":16},"bounds":{"x":97,"y":12,"width":918,"height":1509},"pivot":{"x":556,"y":1521},"sourceFacing":"right","view":"three-quarter","canMirror":false,"mirrorReason":"Appareil thoracique et tube de l’épaule gauche asymétriques.","availableStates":["idle"],"animationFrames":1,"layers":[{"id":"body-with-launcher","path":"assets/sprites/bow/re3r-nemesis/idle-right-armed.png","order":0,"offset":{"x":0,"y":0}}],"modularParts":false,"combatIntegrated":false,"canonicalFidelity":"review-required","presentation":"menu-and-selection","referenceComparison":"Incarnation contrôlée à partir de la référence locale ; réinterprétation générée, fidélité géométrique 1:1 non certifiée.","openStates":["idle-cycle","walk","run","light","heavy","special","super","hurt","guard","knockdown","intro","victory","defeat","left-view","modular-limbs"],"provenance":{"generator":"image_gen built-in","generationDate":"2026-10-22","generatedSourceFilename":"exec-563809bb-0982-46c9-8bfe-be3ee7602ca8.png","references":[{"local":"assets/specimens/re3r-nemesis.webp","sourcePage":"https://www.evilresource.com/resident-evil-3-remake/enemies/nemesis","role":"incarnation reference"},{"local":"assets/sprites/bow/re3r-nemesis/idle-right.png","role":"generated body edit target"}],"promptFile":"assets/sprites/bow/generation-prompts.json","originalBytesPreserved":true},"integration":{"mainMenu":true,"versusSelection":true,"combatRendering":false,"devViewer":true},"variants":[{"image":"assets/sprites/bow/re3r-nemesis/idle-right.png","width":1024,"height":1536,"format":"PNG","bytes":2565007,"sha256":"9fac32e73e77d403ba71821a573211a4fd57ccd295167e70ef32228ebc4d1fb3","alpha":{"channel":true,"min":0,"max":254,"transparentPixels":862450,"totalPixels":1572864,"transparentFraction":0.548331,"visibleThreshold":16},"bounds":{"x":158,"y":12,"width":723,"height":1513},"pivot":{"x":520,"y":1525},"sourceFacing":"right","view":"three-quarter","id":"unarmed-idle","state":"idle","usage":"production-reference","label":"Corps sans lance-roquettes","animationFrames":1,"generatedSourceFilename":"exec-31d07546-c301-4ee4-ae11-a612a0a14d35.png"}],"equipment":"rocket-launcher"}],"counts":{"identities":4,"pngFiles":5,"animatedClips":0,"riggedBodies":0,"canonicalFidelityCertified":0,"variantPoses":1}} /* SPRITES_R20_END */;
  const freeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  freeze(manifest);
  const records = new Map(manifest.sprites.map(record => [record.id, record]));
  const cache = new Map();
  const script = root.document?.currentScript?.src;
  const base = script ? new URL('../', script).href : root.location?.href || 'http://localhost/';
  const get = id => records.get(id) || null;
  const url = id => {
    const record = get(id);
    return record ? new URL(record.image, base).href : null;
  };
  function load(id, { state = 'idle' } = {}) {
    const record = get(id);
    if (!record) return Promise.reject(new Error('unknown-sprite'));
    if (!record.availableStates.includes(state)) return Promise.reject(new Error('state-unavailable'));
    const existing = cache.get(id);
    if (existing) return existing.promise;
    const entry = { image: null, ready: false, promise: null };
    entry.promise = new Promise((resolve, reject) => {
      const image = new root.Image();
      entry.image = image;
      image.onload = () => {
        if (image.naturalWidth !== record.width || image.naturalHeight !== record.height) {
          if (cache.get(id) === entry) cache.delete(id);
          reject(new Error('sprite-dimensions-mismatch'));
          return;
        }
        entry.ready = true;
        resolve({ image, record });
      };
      image.onerror = () => {
        if (cache.get(id) === entry) cache.delete(id);
        reject(new Error('sprite-load-failed'));
      };
      image.src = url(id);
    });
    // Four identities bound the decoded image cache. Errors permit an explicit retry.
    cache.set(id, entry);
    return entry.promise;
  }
  function draw(context, id, options = {}) {
    const record = get(id);
    if (!record) return { ok: false, reason: 'unknown-sprite' };
    const { x = 0, y = 0, height = 300, facing = 'right', state = 'idle', opacity = 1 } = options;
    if (!record.availableStates.includes(state)) return { ok: false, reason: 'state-unavailable' };
    if (!['left', 'right'].includes(facing)) return { ok: false, reason: 'invalid-facing' };
    if (facing !== record.sourceFacing && !record.canMirror) return { ok: false, reason: 'direction-unavailable' };
    if (![x, y, height, opacity].every(Number.isFinite) || height <= 0 || height > 8192 || opacity < 0 || opacity > 1) {
      return { ok: false, reason: 'invalid-layout' };
    }
    const entry = cache.get(id);
    if (!entry?.ready) return { ok: false, reason: 'not-loaded' };
    const crop = record.bounds;
    const scale = height / crop.height;
    context.save();
    try {
      context.translate(x, y);
      context.scale(facing === record.sourceFacing ? scale : -scale, scale);
      context.globalAlpha *= opacity;
      context.drawImage(entry.image, crop.x, crop.y, crop.width, crop.height,
        crop.x - record.pivot.x, crop.y - record.pivot.y, crop.width, crop.height);
    } finally {
      context.restore();
    }
    return { ok: true, width: crop.width * scale, height, frames: 1 };
  }
  root.BOWSpritesR20 = Object.freeze({
    manifest,
    get,
    list: () => manifest.sprites.slice(),
    url,
    load,
    draw,
    clear: () => cache.clear(),
    cacheSize: () => cache.size
  });
})(globalThis);
