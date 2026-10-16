/* Resident Evil: B.O.W. Protocol — original CQC 0.60 rendering contracts.
 * Supplied reference images retain their proportions, colours and anatomy.
 * A reference pose is moved as a whole; this is not a skeletal animation rig.
 */
(function (root) {
  'use strict';

  const doc = root.document;
  const scriptAssetRoot = doc.currentScript?.src ? new URL('../', doc.currentScript.src).href : null;
  const WIDTH = 1280, HEIGHT = 720;
  const LIMITS = Object.freeze({ portrait: 40, sprite: 8, stage: 4 });
  const PRIORITY = { stage: 3, sprite: 2, portrait: 1 };
  const cache = new Map(), queue = [], failures = new Map();
  const portraitBindings = new WeakMap(), regionBindings = new WeakMap(), stageBindings = new WeakMap();
  let revision = 0, loading = 0, completed = 0, released = 0;
  let rosterSource = null, rosterIndex = new Map();
  const animationClock = root.RE_FIGHTER_DIRECTIONS.createClock();
  const cinemaBindings = new WeakMap();

  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const now = () => root.performance ? root.performance.now() / 1000 : Date.now() / 1000;
  const normalizePath = path => String(path || '').replace(/^\.\//, '');

  function resolveAsset(path) {
    const key = normalizePath(path);
    const embedded = root.RE_ASSET_DATA && (root.RE_ASSET_DATA[key] || root.RE_ASSET_DATA[path]);
    if (typeof embedded === 'string') return embedded;
    if (/^(?:data:|blob:|https?:|file:)/i.test(key)) return key;
    if (!key) return '';
    try {
      return root.RE_ASSET_BASE ? new URL('../' + key.replace(/^\//, ''), root.RE_ASSET_BASE).href : new URL(key.replace(/^\//, ''), scriptAssetRoot || new URL('../', doc.baseURI).href).href;
    } catch (_) {
      return key;
    }
  }

  function publishStatus() {
    if (doc.documentElement) doc.documentElement.dataset.reAssetErrors = String(failures.size);
    if (typeof root.CustomEvent === 'function') {
      root.dispatchEvent(new root.CustomEvent('re:assetstatus', {
        detail: { loading, queued: queue.length, errors: failures.size, completed }
      }));
    }
  }

  function releaseEntry(entry) {
    if (entry.state === 'loading' || entry.state === 'queued') return;
    cache.delete(entry.key);
    if (entry.image) {
      entry.image.onload = entry.image.onerror = null;
      entry.image.removeAttribute('src');
    }
    entry.image = null;
    if (entry.cutout) entry.cutout.width = entry.cutout.height = 1;
    entry.cutout = null;
    entry.bounds = null;
    // The detached cutout was released above with the decoded image.
    entry.state = 'released';
    entry.watchers.clear();
    released++;
  }

  function trimCache(kind) {
    const candidates = [...cache.values()].filter(entry => entry.kind === kind &&
      (entry.state === 'ready' || entry.state === 'error')).sort((a, b) => a.used - b.used);
    while (candidates.length > LIMITS[kind]) releaseEntry(candidates.shift());
  }

  function settle(entry, ok) {
    if (entry.state !== 'loading') return;
    loading--;
    entry.state = ok ? 'ready' : 'error';
    entry.used = ++revision;
    if (ok) {
      completed++;
      failures.delete(entry.path);
    } else {
      entry.error = 'Image introuvable ou illisible : ' + entry.path;
      failures.set(entry.path, { path: entry.path, kind: entry.kind, attempts: entry.attempts });
      // The same failure is also shown in its portrait/stage placeholder.
      if (entry.attempts === 1 && root.console) root.console.warn('[B.O.W. visuel]', entry.error);
    }
    const callbacks = [...entry.watchers.values()];
    entry.watchers.clear();
    for (const callback of callbacks) {
      try { callback(); } catch (error) { root.console?.warn('[B.O.W. actualisation]', error); }
    }
    for (const resolve of entry.waiters.splice(0)) resolve({ ok, path: entry.path });
    trimCache(entry.kind);
    publishStatus();
    pump();
  }

  function pump() {
    queue.sort((a, b) => PRIORITY[b.kind] - PRIORITY[a.kind] || b.used - a.used);
    while (loading < 6 && queue.length) {
      const entry = queue.shift();
      if (entry.state !== 'queued') continue;
      entry.state = 'loading';
      entry.attempts++;
      loading++;
      const img = new root.Image();
      entry.image = img;
      img.decoding = 'async';
      img.onload = () => settle(entry, img.naturalWidth > 0 && img.naturalHeight > 0);
      img.onerror = () => settle(entry, false);
      img.src = resolveAsset(entry.path);
    }
  }

  function requestAsset(path, kind) {
    const clean = normalizePath(path);
    if (!clean) return null;
    const key = kind + ':' + clean;
    let entry = cache.get(key);
    if (!entry) {
      entry = { key, path: clean, kind, state: 'queued', image: null, bounds: null,
        used: ++revision, attempts: 0, watchers: new Map(), waiters: [] };
      cache.set(key, entry);
      queue.push(entry);
      pump();
    }
    entry.used = ++revision;
    return entry;
  }

  function watch(entry, identity, callback) {
    if (entry && (entry.state === 'loading' || entry.state === 'queued')) {
      entry.watchers.set(identity, callback);
    }
  }

  function retryAssets() {
    for (const entry of cache.values()) {
      if (entry.state !== 'error') continue;
      entry.error = null;
      entry.state = 'queued';
      if (entry.image) entry.image.onload = entry.image.onerror = null;
      entry.image = null;
      entry.used = ++revision;
      queue.push(entry);
    }
    failures.clear();
    publishStatus();
    pump();
  }

  function findFighter(value) {
    if (value && typeof value === 'object') return value;
    const fighters = root.RE_DATA?.fighters || root.CQC55_DATA?.fighters || [];
    if (fighters !== rosterSource) {
      rosterSource = fighters;
      rosterIndex = new Map();
      fighters.forEach(f => { rosterIndex.set(f.uid, f); rosterIndex.set(f.id, f); });
    }
    return rosterIndex.get(value) || null;
  }

  function spritePath(f) {
    return f?.sprite || f?.visual?.sprite || f?.portrait || '';
  }

  function portraitPath(f) {
    return f?.portrait || f?.sprite || f?.visual?.sprite || '';
  }

  // Alpha bounds only choose a source rectangle. No image pixels are edited.
  function alphaBounds(entry) {
    if (entry.bounds) return entry.bounds;
    const img = entry.image;
    if (!img) return { x: 0, y: 0, w: 1, h: 1 };
    const full = { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
    entry.bounds = full;
    try {
      const scale = Math.min(1, 280 / Math.max(full.w, full.h));
      const probe = doc.createElement('canvas');
      probe.width = Math.max(1, Math.ceil(full.w * scale));
      probe.height = Math.max(1, Math.ceil(full.h * scale));
      const ctx = probe.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, probe.width, probe.height);
      const pixels = ctx.getImageData(0, 0, probe.width, probe.height).data;
      let left = probe.width, top = probe.height, right = 0, bottom = 0;
      for (let y = 0; y < probe.height; y++) {
        for (let x = 0; x < probe.width; x++) {
          if (pixels[(y * probe.width + x) * 4 + 3] < 12) continue;
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
      }
      if (right > left && bottom > top) {
        left = Math.max(0, left - 1); top = Math.max(0, top - 1);
        right = Math.min(probe.width, right + 2); bottom = Math.min(probe.height, bottom + 2);
        entry.bounds = { x: left / probe.width * full.w, y: top / probe.height * full.h,
          w: (right - left) / probe.width * full.w, h: (bottom - top) / probe.height * full.h };
      }
      probe.width = probe.height = 1;
    } catch (_) {
      // Cross-origin references remain drawable using their complete rectangle.
    }
    return entry.bounds;
  }

  function cropFor(entry, value) {
    if (!value) return alphaBounds(entry);
    const img = entry.image;
    const parts = Array.isArray(value) ? value : [value.x, value.y, value.w, value.h];
    if (parts.length !== 4 || parts.some(part => !Number.isFinite(Number(part)))) return alphaBounds(entry);
    const normalized = parts.every(part => Math.abs(Number(part)) <= 1);
    const sx = normalized ? img.naturalWidth : 1, sy = normalized ? img.naturalHeight : 1;
    const x = clamp(number(parts[0]) * sx, 0, img.naturalWidth - 1);
    const y = clamp(number(parts[1]) * sy, 0, img.naturalHeight - 1);
    return { x, y, w: clamp(number(parts[2]) * sx, 1, img.naturalWidth - x),
      h: clamp(number(parts[3]) * sy, 1, img.naturalHeight - y) };
  }

  function drawFit(ctx, entry, x, y, w, h, options = {}) {
    if (!entry || entry.state !== 'ready' || !entry.image) return false;
    const b = cropFor(entry, options.crop);
    const ratio = options.cover ? Math.max(w / b.w, h / b.h) : Math.min(w / b.w, h / b.h);
    const dw = b.w * ratio, dh = b.h * ratio;
    const dx = x + (w - dw) * number(options.anchorX, .5);
    const dy = y + (h - dh) * number(options.anchorY, .5);
    ctx.drawImage(entry.image, b.x, b.y, b.w, b.h, dx, dy, dw, dh);
    return true;
  }

  function type(ctx, text, x, y, size = 10, color = '#b9aaa0', align = 'left') {
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.font = '500 ' + size + 'px ui-monospace, SFMono-Regular, Consolas, monospace';
    ctx.fillText(String(text || ''), x, y);
  }

  function imagePlaceholder(ctx, x, y, w, h, entry, label) {
    ctx.save();
    ctx.fillStyle = '#0c0e11'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = entry?.state === 'error' ? '#8b3031' : '#494344';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2));
    const m = Math.min(w, h) * .17;
    ctx.strokeStyle = '#4d4140';
    ctx.beginPath();
    ctx.moveTo(x + m, y + m * 1.5); ctx.lineTo(x + m, y + h - m * 1.5);
    ctx.moveTo(x + w - m, y + m * 1.5); ctx.lineTo(x + w - m, y + h - m * 1.5);
    ctx.stroke();
    if (w > 80 && h > 60) {
      type(ctx, label || 'SPÉCIMEN', x + w / 2, y + h / 2 - 7, Math.min(12, w / 13), '#b8ada3', 'center');
      type(ctx, entry?.state === 'error' ? 'VISUEL INDISPONIBLE' : entry ? 'CHARGEMENT…' : 'VISUEL À DOCUMENTER',
        x + w / 2, y + h / 2 + 12, Math.min(10, w / 18), '#a66f67', 'center');
    }
    ctx.restore();
  }

  function portraitBackground(ctx, x, y, w, h) {
    ctx.fillStyle = '#0b0c0e'; ctx.fillRect(x, y, w, h);
    const gradient = ctx.createRadialGradient(x + w * .53, y + h * .36, 0,
      x + w * .5, y + h * .36, Math.max(w, h) * .68);
    gradient.addColorStop(0, '#3c302e'); gradient.addColorStop(.48, '#201c1d'); gradient.addColorStop(1, '#080a0c');
    ctx.fillStyle = gradient; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#b6a89b12'; ctx.lineWidth = 1;
    const gap = Math.max(25, w / 10);
    ctx.beginPath();
    for (let gx = x + gap; gx < x + w; gx += gap) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
    for (let gy = y + gap; gy < y + h; gy += gap) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
    ctx.stroke();
  }

  function renderPortraitRegion(ctx, f, x, y, w, h, options = {}) {
    const entry = requestAsset(portraitPath(f), 'portrait');
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    portraitBackground(ctx, x, y, w, h);
    const large = w >= 240 && h >= 220;
    if (entry?.state === 'ready') {
      const pad = large ? Math.min(w, h) * .045 : 1;
      drawFit(ctx, entry, x + pad, y + (large ? 27 : 0), w - pad * 2, h - (large ? 47 : 0),
        { crop: f?.portraitCrop || f?.visual?.portraitCrop, anchorY: 1 });
      const shade = ctx.createLinearGradient(0, y + h * .69, 0, y + h);
      shade.addColorStop(0, '#07070900'); shade.addColorStop(1, large ? '#070709d9' : '#0707094d');
      ctx.fillStyle = shade; ctx.fillRect(x, y + h * .68, w, h * .32);
      if (large && options.labels !== false) {
        type(ctx, 'B.O.W. / ' + String(f?.id || f?.uid || 'ARCHIVE').replace(/^re__/, '').toUpperCase().slice(0, 31),
          x + 15, y + 20, 10, '#c4b8a8');
        type(ctx, String(f?.game || f?.ep || 'ARCHIVES BIOLOGIQUES').toUpperCase().slice(0, 48),
          x + 15, y + h - 16, 9, '#a99a8f');
        ctx.fillStyle = '#a5262c'; ctx.fillRect(x + 15, y + h - 36, 24, 2);
      }
    } else {
      imagePlaceholder(ctx, x, y, w, h, entry, 'ARCHIVE BIOLOGIQUE');
    }
    ctx.restore();
    return entry;
  }

  function drawPortrait(canvas, fighter) {
    if (!canvas?.getContext) return true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    const f = findFighter(fighter);
    const binding = { f, uid: f?.uid, serial: ++revision };
    portraitBindings.set(canvas, binding);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const entry = renderPortraitRegion(ctx, f, 0, 0, canvas.width, canvas.height);
    canvas.dataset.portraitReady = String(entry?.state === 'ready');
    canvas.dataset.reAssetState = entry?.state || 'missing';
    if (f) canvas.dataset.reSpecimen = f.uid || f.id || '';
    watch(entry, canvas, () => {
      if (portraitBindings.get(canvas) !== binding) return;
      drawPortrait(canvas, f);
    });
    return true;
  }

  function drawPortraitInContext(ctx, fighter, x, y, w, h, options = {}) {
    if (!ctx?.canvas) return true;
    const f = findFighter(fighter);
    const region = [x, y, w, h].join(':');
    let bindings = regionBindings.get(ctx.canvas);
    if (!bindings) regionBindings.set(ctx.canvas, bindings = new Map());
    const binding = { uid: f?.uid, serial: ++revision, identity: bindings.get(region)?.identity || {} };
    bindings.set(region, binding);
    const entry = renderPortraitRegion(ctx, f, x, y, w, h, options);
    watch(entry, binding.identity, () => {
      if (bindings.get(region) === binding) renderPortraitRegion(ctx, f, x, y, w, h, options);
    });
    return true;
  }

  function silhouettePlaceholder(ctx, f, entry, height) {
    const width = Math.max(64, Math.min(150, height * .48));
    imagePlaceholder(ctx, -width / 2, -height, width, height, entry, 'B.O.W.');
    type(ctx, String(f?.name || '').slice(0, 22), 0, -height - 12, 10, '#bfae9f', 'center');
  }

  function sourceFacing(value) {
    if (value === 'front' || value === 'frontal' || value === 0) return 0;
    if (value === 'left' || value === 'gauche' || number(value, 1) < 0) return -1;
    return 1;
  }

  function drawAttackAccent(ctx, f, face, height, width, pose) {
    if (!pose.attack || pose.reduceMotion || pose.reducedMotion) return;
    const progress = clamp(number(pose.moveProgress, .4), 0, 1);
    const strength = Math.max(0, 1 - Math.abs(progress - .42) * 5);
    if (!strength) return;
    const move = pose.actor?.attack?.def || {};
    if (pose.moveKind === 'projectile' || move.kind === 'projectile') return;
    ctx.save();
    ctx.globalAlpha *= strength * .62;
    ctx.lineCap = 'round'; ctx.strokeStyle = '#d7c6af'; ctx.lineWidth = 2;
    const cx = face * Math.min(width * .34, 66), cy = -height * .59;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + face * (i * 8 - 16), cy - 29 - i * 8);
      ctx.quadraticCurveTo(cx + face * 54, cy - 6, cx + face * (67 - i * 4), cy + 29 + i * 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Optional exact border-connected black matte removal, only for reviewed sources.
  // Interior dark feathers/eyes are preserved, and portrait images remain untouched.
  function spriteBitmap(entry, plan) {
    const tolerance = plan.borderKey;
    if (!Number.isInteger(tolerance) || tolerance < 0 || tolerance > 12) return entry.image;
    if (entry.cutout && entry.cutoutTolerance === tolerance) return entry.cutout;
    try {
      const w=entry.image.naturalWidth,h=entry.image.naturalHeight;
      if(w*h>4*1024*1024)return entry.image;
      const cv=doc.createElement('canvas');cv.width=w;cv.height=h;
      const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(entry.image,0,0);
      const image=cx.getImageData(0,0,w,h),bytes=image.data,seen=new Uint8Array(w*h),queue=new Uint32Array(w*h);let head=0,tail=0;
      const offer=i=>{if(i<0||i>=w*h||seen[i])return;seen[i]=1;const p=i*4;if(bytes[p]<=tolerance&&bytes[p+1]<=tolerance&&bytes[p+2]<=tolerance){bytes[p+3]=0;queue[tail++]=i;}};
      for(let x=0;x<w;x++){offer(x);offer((h-1)*w+x);}for(let y=0;y<h;y++){offer(y*w);offer(y*w+w-1);}
      while(head<tail){const i=queue[head++],x=i%w;if(x)offer(i-1);if(x<w-1)offer(i+1);offer(i-w);offer(i+w);}
      cx.putImageData(image,0,0);entry.cutout=cv;entry.cutoutTolerance=tolerance;return cv;
    } catch (_) { return entry.image; }
  }

  function drawFighter(ctx, fighter, x, y, facing = 1, scale = 1, pose = {}) {
    if (!ctx) return true;
    const f = findFighter(fighter), v = f?.visual || {};
    const directions = root.RE_FIGHTER_DIRECTIONS;
    const sampledPose = { ...pose, animationTick: animationClock.tick(pose) };
    let plan = directions.resolve(f, facing, sampledPose, number(x));
    const requestedPlan = plan;
    let entry = requestAsset(plan.path, 'sprite');
    // An atlas can be loading, absent, or corrupt. Keep the SAME reviewed side in
    // its idle pose while possible; do not suddenly show a frontal portrait.
    if (entry?.state !== 'ready' && plan.animated) {
      const still = directions.resolve(f, facing, sampledPose, number(x), { skipClips: true });
      if (still.sideProfile) {
        const stillEntry = requestAsset(still.path, 'sprite');
        if (stillEntry?.state === 'ready') {
          plan = { ...still, animationUnavailable: true, requestedState: requestedPlan.state };
          entry = stillEntry;
        }
      }
    }
    if (entry?.state === 'error' && plan.sideProfile) {
      plan = { ...directions.resolve(f, facing, sampledPose, number(x), { skipClips: true, skipViews: true }),
        status: 'asset-error', sideProfile: false, animated: false, animationUnavailable: requestedPlan.animated };
      entry = requestAsset(plan.path, 'sprite');
    }
    if (entry?.state === 'error' && plan.referenceOverride && plan.path !== spritePath(f)) {
      plan = { ...plan, path: spritePath(f), crop: f?.spriteCrop || f?.visual?.spriteCrop || null, anchor: [.5, 1], borderKey: undefined, referenceOverride: false, status: 'reference-asset-error', sideProfile: false, animated: false };
      entry = requestAsset(plan.path, 'sprite');
    }
    const face = plan.face;
    const baseHeight = clamp(number(v.drawHeight, number(v.height, v.kind === 'quadruped' ? 112 : 225)), 45, 580);
    const assetScale = clamp(number(v.scale, 1), .25, 3);
    const outputScale = Math.max(.05, number(scale, 1)) * assetScale;
    const quiet = !!(plan.animated || plan.animationUnavailable || pose.reduceMotion || pose.reducedMotion || pose.time === 0);
    const time = quiet ? 0 : number(pose.time, now());
    const progress = clamp(number(pose.moveProgress, .5), 0, 1);
    const pulse = pose.attack ? Math.sin(progress * Math.PI) : 0;
    const stepping = pose.walk && !quiet ? Math.sin(time * (pose.dash ? 18 : 10)) : 0;
    let bodyHeight = baseHeight;
    let bodyWidth = baseHeight * .55;
    let crop;
    if (entry?.state === 'ready') {
      crop = cropFor(entry, plan.crop);
      bodyWidth = bodyHeight * crop.w / crop.h;
      const cap = number(v.maxDrawWidth, 760);
      if (bodyWidth > cap) { bodyHeight *= cap / bodyWidth; bodyWidth = cap; }
    }
    ctx.save();
    ctx.translate(number(x), number(y));
    ctx.scale(outputScale, outputScale);
    ctx.save();
    ctx.globalAlpha *= pose.jump ? .23 : .5;
    ctx.fillStyle = '#000';
    ctx.shadowColor = '#000b'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(0, 4, Math.max(23, bodyWidth * .37), Math.max(5, bodyWidth * .045), 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const lean = quiet ? 0 : (pose.hit ? -.045 * face : pose.attack ? .025 * face * pulse : stepping * .008);
    const lift = quiet ? 0 : pose.walk ? -Math.abs(stepping) * 2.2 : Math.sin(time * 2.1) * .7;
    const advance = (plan.animated || plan.animationUnavailable) ? 0 : pose.attack ? face * pulse * 11 : pose.guard ? -face * 3 : 0;
    ctx.translate(advance, lift);
    ctx.rotate((plan.animated || plan.animationUnavailable) ? 0 : pose.knockdown ? face * 1.34 : lean + (pose.crouch ? .05 * face : 0));
    // The same plan is shared by Versus, dossiers, replays, finishers and both laboratories.
    // Opposite-side artwork is selected before drawing; do not flip a paired sprite again.
    const mirror = plan.mirror;
    if (entry?.state === 'ready' && crop) {
      ctx.save();
      ctx.scale(mirror, 1);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.shadowColor = pose.hit ? '#7f25224d' : '#000b';
      ctx.shadowBlur = pose.hit ? 8 : 3;
      ctx.drawImage(spriteBitmap(entry, plan), crop.x, crop.y, crop.w, crop.h,
        -bodyWidth * plan.anchor[0], -bodyHeight * plan.anchor[1], bodyWidth, bodyHeight);
      ctx.restore();
    } else silhouettePlaceholder(ctx, f, entry, bodyHeight);
    if(plan.animationUnavailable)type(ctx,'ANIMATION NON CHARGÉE · POSE CONSERVÉE',0,34,8,'#d6ba82','center');
    if(!plan.sideProfile || f?.fidelity?.visualStatus?.includes('provisional')){ctx.fillStyle='#deb877';ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText(plan.status==='asset-error'?'SPRITE LATÉRAL INDISPONIBLE':plan.sideProfile?'POSE DE RÉFÉRENCE LATÉRALE':'PROFIL LATÉRAL À PRODUIRE',0,20);}
    if(pose.actor?.statuses?.exposed?.t>0&&!root.RE_SPATIAL?.profile(pose.actor)){ctx.strokeStyle='#e6b862';ctx.lineWidth=2;ctx.strokeRect(-bodyWidth/2-8,-bodyHeight-8,bodyWidth+16,bodyHeight+13);ctx.fillStyle='#f1cc81';ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText('NOYAU EXPOSÉ',0,-bodyHeight-17);}
    if (!pose.knockdown) drawAttackAccent(ctx, f, face, bodyHeight, bodyWidth, pose);
    ctx.restore();
    if(pose.actor&&root.RE_SPATIAL&&root.CQCCombat060&&!pose.knockdown)root.RE_SPATIAL.draw(ctx,pose.actor,root.CQCCombat060.box(pose.actor),number(x),number(y),number(scale,1));
    return true;
  }

  function drawContainmentFallback(ctx, stage, entry) {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, '#090b0e'); gradient.addColorStop(.62, '#1c1e21'); gradient.addColorStop(1, '#08090b');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#131619'; ctx.fillRect(384, 100, 512, 440);
    ctx.strokeStyle = '#444445'; ctx.lineWidth = 2; ctx.strokeRect(383, 98, 514, 444);
    ctx.fillStyle = '#0b0e11'; ctx.fillRect(421, 125, 437, 414);
    ctx.strokeStyle = '#343436'; ctx.strokeRect(436, 139, 406, 392);
    ctx.beginPath(); ctx.moveTo(640, 139); ctx.lineTo(640, 531); ctx.stroke();
    for (const px of [160, 310, 970, 1120]) {
      ctx.fillStyle = '#141719'; ctx.fillRect(px, 0, 29, 560);
      ctx.fillStyle = '#333031'; ctx.fillRect(px + 2, 0, 2, 560);
    }
    ctx.fillStyle = '#8b2024'; ctx.fillRect(604, 97, 72, 5);
    const lamp = ctx.createRadialGradient(640, 102, 1, 640, 102, 145);
    lamp.addColorStop(0, '#a9232930'); lamp.addColorStop(1, '#a9232900');
    ctx.fillStyle = lamp; ctx.fillRect(495, 0, 290, 247);
    ctx.fillStyle = '#0b0d10'; ctx.fillRect(0, 562, WIDTH, HEIGHT - 562);
    ctx.strokeStyle = '#918a7918'; ctx.lineWidth = 1; ctx.beginPath();
    for (let px = -WIDTH; px <= WIDTH * 2; px += 200) { ctx.moveTo(640 + (px - 640) * .3, 562); ctx.lineTo(px, 720); }
    for (const py of [583, 616, 666, 719]) { ctx.moveTo(0, py); ctx.lineTo(WIDTH, py); }
    ctx.stroke();
    type(ctx, entry ? (entry.state === 'error' ? 'DÉCOR INDISPONIBLE' : 'CHARGEMENT DU DÉCOR…') : 'ENVIRONNEMENT DE SIMULATION',
      640, 211, 13, '#8b817a', 'center');
    type(ctx, stage?.name || 'CONFINEMENT', 640, 237, 10, '#796d68', 'center');
  }

  function atmosphere(ctx, stage, time, preview) {
    const weather = String(stage?.weather || stage?.family || '').toLowerCase();
    const fog = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    fog.addColorStop(0, '#02030555'); fog.addColorStop(.48, '#04040608');
    fog.addColorStop(.78, '#06070930'); fog.addColorStop(1, '#050607e0');
    ctx.fillStyle = fog; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (/rain|pluie|storm/.test(weather) && time) {
      ctx.save(); ctx.strokeStyle = '#d4dce029'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 56; i++) {
        const rx = (i * 217.7 + time * 16) % 1350 - 30;
        const ry = (i * 91.13 + time * 371) % HEIGHT;
        ctx.moveTo(rx, ry); ctx.lineTo(rx - 6, ry + 23);
      }
      ctx.stroke(); ctx.restore();
    }
    if (/snow|neige|ash|cendre|ember|spore/.test(weather) && time) {
      ctx.save(); ctx.fillStyle = /ember|cendre/.test(weather) ? '#e7b39e50' : '#e0d8c65a';
      for (let i = 0; i < 27; i++) {
        const px = (i * 283 + Math.sin(time * .45 + i) * 18) % WIDTH;
        const py = (i * 57 + time * 17) % HEIGHT;
        ctx.fillRect(px, py, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
      }
      ctx.restore();
    }
    if (!preview) {
      ctx.strokeStyle = '#c8b79815'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 570); ctx.lineTo(WIDTH, 570); ctx.stroke();
    }
    const shade = ctx.createRadialGradient(640, 320, 180, 640, 340, 735);
    shade.addColorStop(0, '#00000000'); shade.addColorStop(1, '#000000b0');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function drawStage(ctx, stage, time = 0, camera = 0, preview = false) {
    if (!ctx) return true;
    const s = stage || root.RE_DATA?.stages?.[0] || {};
    if(s.re5Scene&&root.RE5_SCENES?.draw(ctx,s,root.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:time,camera,preview))return true;
    const entry = requestAsset(s.background || s.image || '', 'stage');
    const miniBinding = ctx.canvas?.id === 'stageMini' ? { id: s.id, serial: ++revision } : null;
    if (miniBinding) stageBindings.set(ctx.canvas, miniBinding);
    ctx.save();
    ctx.fillStyle = '#080a0d'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (entry?.state === 'ready') {
      const parallax = clamp(number(camera), -300, 300) * .05;
      drawFit(ctx, entry, -32 - parallax, -18, WIDTH + 64, HEIGHT + 36,
        { cover: true, crop: s.backgroundCrop, anchorX: number(s.focalX, .5), anchorY: number(s.focalY, .5) });
      if (s.tint && /^#[0-9a-f]{8}$/i.test(s.tint)) { ctx.fillStyle = s.tint; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
    } else {
      drawContainmentFallback(ctx, s, entry);
      // A stage miniature is not otherwise repainted by the original CQC engine.
      if (miniBinding) watch(entry, ctx.canvas, () => {
        if (stageBindings.get(ctx.canvas) === miniBinding) drawStage(ctx, s, time, camera, preview);
      });
    }
    atmosphere(ctx, s, number(time), preview);
    ctx.restore();
    return true;
  }

  function preloadStage(stage) {
    const s = typeof stage === 'string' ? root.RE_DATA?.stages?.find(item => item.id === stage) : stage;
    if(s?.re5Scene&&root.RE5_SCENES?.themes.includes(s.re5Scene))return Promise.resolve({ok:true,path:'procedural:'+s.id});
    const entry = requestAsset(s?.background || s?.image || '', 'stage');
    if (!entry) return Promise.resolve({ ok: false, path: '' });
    if (entry.state === 'ready' || entry.state === 'error') return Promise.resolve({ ok: entry.state === 'ready', path: entry.path });
    return new Promise(resolve => entry.waiters.push(resolve));
  }

  function drawCinema(canvas, story, phase = 'intro', index = 0, page = 0, options = {}) {
    if (!canvas?.getContext || !story) return true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    const stories = ['intro', 'outro'].includes(phase);
    const card = (stories ? story[phase]?.[page] : story.route?.[index]) || story.intro?.[0] || {};
    const stages = options.stages || Object.fromEntries((root.RE_DATA?.stages || []).map(s => [s.id, s]));
    const fighter = options.fighters?.[story.uid] || findFighter(story.uid);
    const other = options.fighters?.[story.route?.[index]?.opponent] || findFighter(story.route?.[index]?.opponent);
    const stage = stages[card.stage] || stages[story.stage] || root.RE_DATA?.stages?.[0];
    const time = options.motion === false ? 0 : Number.isFinite(options.time) ? Math.max(0, options.time) : now();
    const sceneKey = JSON.stringify([story.uid, phase, index, page, other?.uid, canvas.id]);
    let binding = cinemaBindings.get(canvas);
    if (!binding || binding.key !== sceneKey) { binding = { key: sceneKey, subject: {}, opponent: {} }; cinemaBindings.set(canvas, binding); }
    const cinemaState = phase === 'outro' || phase === 'post' ? 'win' : phase === 'defeat' ? 'lose' : phase === 'pre' ? 'guard' : 'idle';
    const hero = canvas.id === 'heroArt';
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(canvas.width / WIDTH, canvas.height / HEIGHT);
    drawStage(ctx, stage, time, time ? Math.sin(time * .14) * 75 : 0, true);
    const target = hero ? 535 : 410;
    const visualHeight = number(fighter?.visual?.drawHeight, number(fighter?.visual?.height, 225));
    const subjectPlan = root.RE_FIGHTER_DIRECTIONS.resolve(fighter, hero ? -1 : 1);
    const subjectImage = requestAsset(subjectPlan.path, 'sprite');
    const subjectBounds = subjectImage?.state === 'ready' ? cropFor(subjectImage,
      subjectPlan.crop) : null;
    const visualWidth = subjectBounds ? Math.min(number(fighter?.visual?.maxDrawWidth, 760),
      visualHeight * subjectBounds.w / subjectBounds.h) : visualHeight * .6;
    const bigScale = Math.min(clamp(target / visualHeight, .5, 3.5), 630 / visualWidth) /
      clamp(number(fighter?.visual?.scale, 1), .25, 3);
    if (!stories && other) {
      ctx.save(); ctx.globalAlpha = .62;
      drawFighter(ctx, other, 912, 638, -1, Math.min(1.38, 400 / number(other.visual?.height, 225)),
        { time, animationKey: binding.opponent, animationState: phase === 'post' ? 'lose' : phase === 'defeat' ? 'win' : 'guard', guard: phase === 'pre', reduceMotion: !time });
      ctx.restore();
    }
    drawFighter(ctx, fighter, hero ? 985 : 318, hero ? 725 : 694, hero ? -1 : 1, bigScale,
      { time, animationKey: binding.subject, animationState: cinemaState, guard: phase === 'pre', reduceMotion: !time });
    const edge = ctx.createLinearGradient(0, 0, WIDTH, 0);
    if (hero) {
      edge.addColorStop(0, '#08090bed'); edge.addColorStop(.4, '#08090b9f'); edge.addColorStop(.7, '#08090b00');
    } else {
      edge.addColorStop(0, '#06070916'); edge.addColorStop(.5, '#06070900'); edge.addColorStop(1, '#0607099c');
    }
    ctx.fillStyle = edge; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const foot = ctx.createLinearGradient(0, 575, 0, HEIGHT);
    foot.addColorStop(0, '#05060900'); foot.addColorStop(1, '#050609e3');
    ctx.fillStyle = foot; ctx.fillRect(0, 575, WIDTH, 145);
    ctx.restore();
    return true;
  }

  // Resolve and warm only the two currently required sides, not a whole roster.
  async function preloadFighter(fighter, pose = {}) {
    const f = findFighter(fighter), state = root.RE_FIGHTER_DIRECTIONS.poseState(pose);
    const paths = new Set();
    for (const face of [-1, 1]) {
      const sample = { ...pose, actor: null, opponentX: undefined, animationState: state };
      paths.add(root.RE_FIGHTER_DIRECTIONS.resolve(f, face, sample).path);
      paths.add(root.RE_FIGHTER_DIRECTIONS.resolve(f, face, sample, undefined, { skipClips: true }).path);
    }
    return Promise.all([...paths].map(path => {
      const e = requestAsset(path, 'sprite');
      if (!e) return Promise.resolve({ ok: false, path });
      if (e.state === 'ready' || e.state === 'error') return Promise.resolve({ ok: e.state === 'ready', path });
      return new Promise(resolve => e.waiters.push(resolve));
    }));
  }

  function diagnostics() {
    const items = [...cache.values()];
    return {
      version: 'RE-1.0 / CQC-0.60',
      animation: 'Direction-specific sprite selection; unresolved front references remain explicitly provisional.',
      directionalArt: 're.bow.directional-art/1',
      directionalRevision: root.RE_DIRECTIONAL_ART?.revision || 0,
      limits: { ...LIMITS, concurrentLoads: 6 }, loading, queued: queue.length, completed, released,
      cached: Object.fromEntries(Object.keys(LIMITS).map(kind => [kind,
        items.filter(item => item.kind === kind && item.state === 'ready').length])),
      errors: [...failures.values()],
      assets: items.map(item => ({ path: item.path, kind: item.kind, state: item.state, attempts: item.attempts }))
    };
  }

  const actors = Object.freeze({ draw: drawFighter, diagnostics });
  const presentation = Object.freeze({ stage: drawStage, portrait: drawPortrait, preloadStage, diagnostics, retry: retryAssets });
  const art = Object.freeze({ drawStage, drawFighter, drawPortrait });
  const cinema = Object.freeze({ draw: drawCinema, diagnostics });
  root.CQC_ACTORS_060 = root.CQC_ACTORS_059 = root.CQC_ACTORS_058 = actors;
  root.CQC_PRESENTATION_060 = root.CQC_PRESENTATION_059 = root.CQC_PRESENTATION_058 = presentation;
  root.CQC55_ART = art;
  root.CQC56_PORTRAITS = Object.freeze({ draw: drawPortraitInContext, portrait: drawPortrait,
    preload: value => requestAsset(portraitPath(findFighter(value)), 'portrait'), diagnostics });
  root.CQC60_CINEMA = root.CQC58_CINEMA = root.CQC57_CINEMA = root.CQC56_CINEMA = cinema;
  root.RE_RENDERER = Object.freeze({ ...art, drawCinema, drawPortraitInContext,
    resolveAsset, preloadStage, preloadFighter, diagnostics, retryAssets,
    directionalPlan: root.RE_FIGHTER_DIRECTIONS.resolve });
})(window);
