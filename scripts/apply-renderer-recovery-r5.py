#!/usr/bin/env python3
"""Narrow, reviewable R5 source migration. No network or image manipulation."""
from pathlib import Path
import hashlib,json
R=Path(__file__).resolve().parents[1]
EXPECTED={'src/re-renderer.js':'10a7b4aeaf3cd07502f5ab9ede0a34b8dbcc692fc8c572382558162f8eb5fd98','src/fighter-directions.js':'e4f133ea7f2fd38b13974e23449ed53c16b520ceb5249d7facb669003e963625'}
for name,expected in EXPECTED.items():
 assert hashlib.sha256((R/name).read_bytes()).hexdigest()==expected,f'Changed R4 base: {name}'
p=R/'src/re-renderer.js';s=p.read_text()
def replace(a,b):
 global s
 assert s.count(a)==1,('Renderer anchor mismatch',a[:65]);s=s.replace(a,b)
replace("  let revision = 0, loading = 0, completed = 0, released = 0;", "  const LOAD_TIMEOUT_MS = 15000, FAILURE_LIMIT = 512;\n  let revision = 0, loading = 0, completed = 0, released = 0;\n  let retryEpoch = 0, pumping = false;")
start=s.index('  function settle(entry, ok) {');end=s.index('\n  function watch(',start)
s=s[:start]+'''  // A failed image is remembered beyond bitmap eviction. Explicit retry starts
  // a new epoch; errors remain visible until that exact kind/path succeeds.
  function rememberFailure(entry, reason) {
    failures.delete(entry.key);
    failures.set(entry.key, { path: entry.path, kind: entry.kind,
      attempts: entry.attempts, epoch: retryEpoch, reason });
    while (failures.size > FAILURE_LIMIT) failures.delete(failures.keys().next().value);
  }

  function settle(entry, ok, reason = 'load') {
    if (entry.state !== 'loading') return;
    root.clearTimeout(entry.timer);
    entry.timer = null;
    const img = entry.image;
    if (img) img.onload = img.onerror = null;
    loading--;
    entry.state = ok ? 'ready' : 'error';
    entry.used = ++revision;
    if (ok) {
      completed++;
      failures.delete(entry.key);
    } else {
      entry.error = 'Image introuvable ou illisible : ' + entry.path;
      if (reason === 'timeout') entry.error += ' (délai de chargement dépassé)';
      rememberFailure(entry, reason);
      if (img) img.removeAttribute('src');
      entry.image = null;
      if (entry.attempts === 1) root.console?.warn('[B.O.W. visuel]', entry.error);
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
    // Also safe with synchronous decoders or a throwing Image.src setter.
    if (pumping) return;
    pumping = true;
    try {
      queue.sort((a, b) => PRIORITY[b.kind] - PRIORITY[a.kind] || b.used - a.used);
      while (loading < 6 && queue.length) {
        const entry = queue.shift();
        if (entry.state !== 'queued') continue;
        entry.state = 'loading';
        entry.attempts++;
        loading++;
        try {
          const img = new root.Image();
          entry.image = img;
          img.decoding = 'async';
          const finish = (ok, reason) => {
            // A late event belonging to an expired attempt must never settle a retry.
            if (entry.image !== img || entry.state !== 'loading') return;
            settle(entry, ok, reason);
          };
          entry.timer = root.setTimeout(() => finish(false, 'timeout'), LOAD_TIMEOUT_MS);
          img.onload = () => finish(img.naturalWidth > 0 && img.naturalHeight > 0, 'load');
          img.onerror = () => finish(false, 'load');
          img.src = resolveAsset(entry.path);
        } catch (_) { settle(entry, false, 'source'); }
      }
    } finally { pumping = false; }
  }

  function requestAsset(path, kind) {
    const clean = normalizePath(path);
    if (!clean) return null;
    const key = kind + ':' + clean;
    let entry = cache.get(key);
    if (!entry) {
      const failure = failures.get(key);
      const blocked = failure && failure.epoch === retryEpoch;
      entry = { key, path: clean, kind, state: blocked ? 'error' : 'queued', image: null, bounds: null,
        used: ++revision, attempts: failure?.attempts || 0, watchers: new Map(), waiters: [], timer: null };
      cache.set(key, entry);
      if (blocked) trimCache(kind);
      else { queue.push(entry); pump(); }
    }
    entry.used = ++revision;
    return entry;
  }
''' + s[end:]
replace("  function retryAssets() {\n    for (const entry", "  function retryAssets() {\n    retryEpoch++;\n    for (const entry")
replace("    failures.clear();\n    publishStatus();", "    // Do not hide failure diagnostics while the replacement is still loading.\n    publishStatus();")
replace("    entry.bounds = full;\n    try {", "    entry.bounds = full;\n    let probe;\n    try {")
replace("      const probe = doc.createElement('canvas');", "      probe = doc.createElement('canvas');")
replace("      probe.width = probe.height = 1;\n    } catch (_) {\n      // Cross-origin references remain drawable using their complete rectangle.\n    }", "    } catch (_) {\n      // Cross-origin references remain drawable using their complete rectangle.\n    } finally { if (probe) probe.width = probe.height = 1; }")
replace("    if (entry.cutout && entry.cutoutTolerance === tolerance) return entry.cutout;\n    try {", "    if (entry.cutoutTolerance === tolerance && entry.cutoutAttempted) return entry.cutout || entry.image;\n    if (entry.cutout) entry.cutout.width = entry.cutout.height = 1;\n    entry.cutout = null;\n    entry.cutoutTolerance = tolerance;\n    entry.cutoutAttempted = true;\n    let cv;\n    try {")
replace("      const cv=doc.createElement('canvas');cv.width=w;cv.height=h;", "      cv=doc.createElement('canvas');cv.width=w;cv.height=h;")
replace("    } catch (_) { return entry.image; }\n  }", "    } catch (_) { return entry.image; }\n    finally { if (cv && cv !== entry.cutout) cv.width = cv.height = 1; }\n  }")
replace("      plan = { ...plan, path: spritePath(f), crop: f?.spriteCrop || f?.visual?.spriteCrop || null, anchor: [.5, 1], borderKey: undefined, referenceOverride: false, status: 'reference-asset-error', sideProfile: false, animated: false };", "      // Resolve the original's orientation and anchor again. A prepared image\n      // may face the opposite way; its mirror must not leak to the fallback.\n      plan = { ...directions.resolve(f, facing, sampledPose, number(x),\n        { skipClips: true, skipViews: true, skipReference: true }),\n        status: 'reference-asset-error', animationUnavailable: requestedPlan.animated };")
replace("      limits: { ...LIMITS, concurrentLoads: 6 },", "      assetRecovery: 'R5',\n      limits: { ...LIMITS, concurrentLoads: 6, loadTimeoutMs: LOAD_TIMEOUT_MS, rememberedFailures: FAILURE_LIMIT },")
p.write_text(s)
p=R/'src/fighter-directions.js';s=p.read_text();a="const reference=validReference(record?.referenceImage)?record.referenceImage:null;";assert s.count(a)==1;s=s.replace(a,"const reference=!options.skipReference&&validReference(record?.referenceImage)?record.referenceImage:null;");p.write_text(s)
p=R/'package.json';d=json.loads(p.read_text());assert 'verify-renderer-recovery-r5' not in d['scripts']['verify'];d['scripts']['verify']+=' && node tests/verify-renderer-recovery-r5.mjs';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
# Reuse the existing workshop controls and styling; do not alter the art inventory.
p=R/'directions.html';s=p.read_text();a='<div class="direction-meta" id="directionMeta"></div>';assert s.count(a)==1
s=s.replace(a,a+'<div class="direction-controls"><button id="directionRetry" type="button" disabled>RÉESSAYER LES VISUELS</button><span id="directionAssets" role="status" aria-live="polite"></span></div>')
a='Trois poses natives de référence sont disponibles des deux côtés, avec un reflet approuvé ; ce ne sont pas des anatomies opposées redessinées.'
assert a in s;s=s.replace(a,'Le compteur ci-dessous indique la couverture réelle des poses de référence ; un reflet approuvé ne constitue pas une anatomie opposée redessinée.');p.write_text(s)
p=R/'src/directions-page.js';s=p.read_text();a=' function draw(){';assert s.count(a)==1
s=s.replace(a,""" function syncAssets(){
  const d=R.diagnostics(),pending=d.loading+d.queued;
  const label=d.errors.length?(d.errors.length+' VISUEL(S) INDISPONIBLE(S)'+(pending?' · CHARGEMENT EN COURS':' · NOUVEL ESSAI POSSIBLE')):pending?'CHARGEMENT DES VISUELS…':'VISUELS CHARGÉS';
  if($('directionAssets').textContent!==label)$('directionAssets').textContent=label;
  $('directionRetry').disabled=!d.errors.length||pending>0;
 }
 function draw(){
  syncAssets();""")
a=" root.addEventListener('re:assetstatus',()=>dirty=true);";assert a in s
s=s.replace(a," $('directionRetry').addEventListener('click',()=>{R.retryAssets();syncAssets();dirty=true;});\n root.addEventListener('re:assetstatus',()=>{dirty=true;syncAssets();});")
p.write_text(s)
print('R5 asset recovery integrated; gameplay and directional art data untouched.')
