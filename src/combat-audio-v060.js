/* CQC v0.58 — original procedural audio. No recording, network or autoplay. */
(function (scope) {
  'use strict';
  const VERSION = '0.58';
  const DEFAULTS = Object.freeze({ enabled: false, menuEnabled: false, master: 0.28, effects: 0.72, ambience: 0.12 });
  const VALID_PHASES = new Set(['intro', 'fight', 'roundEnd']);
  const CUES = Object.freeze(['punch', 'heavy', 'blade', 'pistol', 'rifle', 'sniper', 'revolver', 'shotgun', 'tranq', 'launch', 'explosion', 'energy', 'fire', 'throw', 'block', 'parry', 'guardBreak', 'reload', 'recover', 'deploy', 'dash', 'round', 'fight', 'ko', 'matchWin', 'draw', 'finisher', 'menu']);
  const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
  const finite = (n, fallback) => typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  const text = (value, max) => typeof value === 'string' ? value.slice(0, max || 80) : '';
  function seedOf(value) { let h = 2166136261; for (const c of String(value)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0 || 1; }
  function generator(seed) { let v = seed >>> 0 || 1; return () => { v ^= v << 13; v ^= v >>> 17; v ^= v << 5; return (v >>> 0) / 4294967296 * 2 - 1; }; }
  function settings(value, prior) {
    const out = { ...(prior || DEFAULTS) };
    if (!value || typeof value !== 'object') return out;
    for (const k of ['enabled', 'menuEnabled']) if (typeof value[k] === 'boolean') out[k] = value[k];
    for (const k of ['master', 'effects', 'ambience']) if (typeof value[k] === 'number' && Number.isFinite(value[k])) out[k] = clamp(value[k], 0, 1);
    return out;
  }
  function durationFor(cue) {
    return ({ menu: 0.09, explosion: 0.8, fire: 0.4, energy: 0.32, ko: 0.65, matchWin: 0.85, round: 0.44, fight: 0.25, draw: 0.5, finisher: 0.68, recover: 0.37, reload: 0.29, sniper: 0.32, shotgun: 0.33, guardBreak: 0.31 })[cue] || 0.18;
  }
  /* All samples are authored here. Deterministic noise makes cues reproducible. */
  function synthesize(cue, sampleRate, variation) {
    if (!CUES.includes(cue)) throw new TypeError('Unknown CQC audio cue: ' + cue);
    const rate = Math.round(clamp(finite(sampleRate, 48000), 8000, 96000));
    const duration = durationFor(cue), length = Math.ceil(rate * duration);
    const samples = new Float32Array(length), random = generator(seedOf(cue + ':' + (variation || 0)));
    const pitch = 1 + ((seedOf(variation || 0) % 9) - 4) * 0.013;
    const tau = Math.PI * 2;
    let low = 0, highPrev = 0;
    const tone = (f, t) => Math.sin(tau * f * pitch * t);
    const sweep = (from, to, t, d) => Math.sin(tau * pitch * (from * t + (to - from) * t * t / (2 * d)));
    for (let i = 0; i < length; i++) {
      const t = i / rate, u = t / duration, n = random();
      low += (n - low) * 0.075;
      const high = n - highPrev; highPrev = n;
      const attack = Math.min(1, t / 0.004), tail = Math.min(1, (duration - t) / 0.022);
      const short = Math.exp(-u * 7), decay = Math.exp(-u * 4.5);
      let v = 0;
      if (cue === 'menu') {
        v = (tone(660, t) * 0.12 + tone(990, t) * 0.07) * Math.sin(Math.PI * u) * decay;
      } else if (cue === 'punch' || cue === 'heavy' || cue === 'throw') {
        const f = cue === 'heavy' ? 82 : cue === 'throw' ? 63 : 135;
        v = (sweep(f * 1.8, f * 0.48, t, duration) * 0.58 + low * 1.7 + high * 0.05) * decay;
      } else if (cue === 'blade') {
        v = high * 0.21 * Math.sin(Math.PI * u) * Math.exp(-u * 3) + (tone(1700, t) + tone(2473, t) * 0.33) * 0.11 * decay;
      } else if (['pistol', 'rifle', 'sniper', 'revolver', 'shotgun', 'tranq'].includes(cue)) {
        const body = ({ pistol: 160, rifle: 106, sniper: 72, revolver: 121, shotgun: 55, tranq: 390 })[cue];
        const softness = cue === 'tranq' ? 0.21 : cue === 'shotgun' ? 0.66 : 0.5;
        v = (n * softness + low * 1.5 + sweep(body * 2, body * 0.3, t, duration) * 0.55) * short;
        if (cue === 'rifle') v += (t > 0.038 ? random() * Math.exp(-(t - 0.038) * 120) * 0.15 : 0);
        if (cue === 'sniper') v += low * 0.35 * Math.exp(-u * 3);
      } else if (cue === 'launch' || cue === 'explosion' || cue === 'fire') {
        const swell = cue === 'fire' ? Math.sin(Math.PI * u) : 1;
        v = (low * (cue === 'explosion' ? 3 : 1.8) + n * 0.2 + sweep(cue === 'launch' ? 250 : 68, 28, t, duration) * 0.32) * decay * swell;
      } else if (cue === 'energy' || cue === 'finisher') {
        v = (sweep(cue === 'finisher' ? 85 : 360, cue === 'finisher' ? 620 : 110, t, duration) * 0.48 + tone(731, t) * 0.14 + high * 0.07) * Math.sin(Math.PI * u) * Math.exp(-u * 1.8);
      } else if (cue === 'block' || cue === 'parry' || cue === 'guardBreak') {
        const base = cue === 'parry' ? 1410 : cue === 'block' ? 780 : 450;
        v = (tone(base, t) * 0.3 + tone(base * 1.413, t) * 0.17 + tone(base * 2.317, t) * 0.12 + high * (cue === 'guardBreak' ? 0.24 : 0.1)) * decay;
      } else if (cue === 'reload' || cue === 'deploy') {
        const clicks = [0.012, cue === 'reload' ? 0.115 : 0.06, cue === 'reload' ? 0.215 : 0.12];
        for (let j = 0; j < clicks.length; j++) if (t >= clicks[j]) v += (high * 0.25 + tone(530 + j * 117, t) * 0.22) * Math.exp(-(t - clicks[j]) * 110);
      } else if (cue === 'recover') {
        v = (tone(t < 0.13 ? 392 : t < 0.26 ? 494 : 587, t) * 0.24 + tone(1174, t) * 0.06) * Math.sin(Math.PI * u);
      } else if (cue === 'dash') {
        v = high * 0.19 * Math.sin(Math.PI * u) * decay;
      } else {
        const notes = ({ round: [147, 196, 247], fight: [196, 294, 392], ko: [147, 110, 73], matchWin: [196, 294, 370, 440], draw: [165, 165, 147] })[cue];
        const index = Math.min(notes.length - 1, Math.floor(u * notes.length));
        const local = u * notes.length - index;
        v = (tone(notes[index], t) * 0.42 + tone(notes[index] * 2, t) * 0.13 + low * 0.15) * Math.sin(Math.PI * local) * (1 - u * 0.24);
      }
      samples[i] = Math.tanh(v * 1.3) * 0.7 * attack * tail;
    }
    return { cue, sampleRate: rate, duration: length / rate, samples };
  }
  const STAGE_FAMILIES = Object.freeze({ flower_field: 'wind', shadow_heliport: 'wind', torture_room: 'interior', tanker_deck: 'sea', big_shell: 'sea', groznyj: 'forest', sokrovenno: 'forest', outer_haven: 'machine', middle_east: 'wind', mother_base: 'sea', costa_rica: 'forest', camp_omega: 'sea', afghan_ruins: 'wind', okb_zero: 'wind', world_marshal: 'machine', pakistan_wreck: 'wind', outer_heaven: 'interior', zanzibar: 'forest', galuade: 'interior', lobito: 'interior', saintlogic: 'machine', san_hieronymo: 'interior', dite: 'wind', vr_grid: 'virtual', arsenal_corridor: 'machine', gindran_fort: 'interior', saintlogic_security: 'machine', dite_crystal_pit: 'virtual', san_hieronymo_yard: 'wind', mother_base_platform: 'sea' });
  function stageFamily(stage) { const id = typeof stage === 'string' ? stage : stage && stage.id; return STAGE_FAMILIES[id] || 'wind'; }
  function ambienceSamples(family, sampleRate) {
    const rate = Math.round(clamp(finite(sampleRate, 48000), 8000, 96000)), seconds = 4, length = rate * seconds;
    const samples = new Float32Array(length), rand = generator(seedOf(family)), harmonics = [];
    const start = ({ wind: 16, sea: 12, forest: 26, interior: 31, machine: 40, virtual: 54 })[family] || 16;
    for (let n = 0; n < 16; n++) harmonics.push({ cycles: start + n * n * 2 + n, phase: (rand() + 1) * Math.PI, amplitude: (0.032 + (rand() + 1) * 0.006) / (1 + n * 0.3) });
    for (let i = 0; i < length; i++) { const u = i / length; let v = 0; for (const h of harmonics) v += Math.sin(Math.PI * 2 * h.cycles * u + h.phase) * h.amplitude; samples[i] = v * (0.78 + Math.sin(Math.PI * 2 * u) * 0.18); }
    return { cue: 'ambience:' + family, sampleRate: rate, duration: seconds, samples };
  }
  function eventCount(state) {
    if (Number.isSafeInteger(state.eventCount) && state.eventCount >= 0) return state.eventCount;
    if (!state.metrics || typeof state.metrics !== 'object') return null;
    let count = 0;
    for (const value of Object.values(state.metrics)) { if (!Number.isSafeInteger(value) || value < 0) return null; count += value; }
    return Number.isSafeInteger(count) ? count : null;
  }
  function snapshot(state, context) {
    context = context || {};
    if (!state || typeof state !== 'object' || !Number.isSafeInteger(state.frame) || state.frame < 0 || !VALID_PHASES.has(state.phase)) return null;
    const total = eventCount(state), rawEvents = Array.isArray(state.events) ? state.events.slice(-180) : [];
    if (total === null || total < rawEvents.length) return null;
    const actors = state.actors || [state.a, state.b];
    const fighters = Array.isArray(state.fighters) && state.fighters.length === 2 ? state.fighters.map(uid => text(uid, 160)) : [0, 1].map(i => text(actors[i] && actors[i].f && actors[i].f.uid, 160));
    const events = rawEvents.map((e, index) => {
      if (!e || !Number.isSafeInteger(e.frame) || e.frame < 0 || e.frame > state.frame || typeof e.type !== 'string') return null;
      const actor = e.actor === 0 || e.actor === 1 ? e.actor : -1, p = actors[actor], f = p && p.f;
      const move = f && f.combat && f.combat.moves && f.combat.moves[e.slot];
      return { seq: total - rawEvents.length + index + 1, frame: e.frame, type: text(e.type, 32), actor, target: e.target === 0 || e.target === 1 ? e.target : -1, slot: text(e.slot, 20), tag: text(e.tag || (move && move.tag), 32), kind: text(e.kind || (move && move.kind), 32), weapon: text(e.weapon || (f && f.visual && f.visual.weapon), 24), amount: clamp(finite(e.amount, 0), 0, 10000), blocked: e.blocked === true, winner: e.winner === 0 || e.winner === 1 ? e.winner : -1 };
    }).filter(Boolean);
    return { version: VERSION, fighters, session: text(context.session || state.session, 160), stage: text(typeof context.stage === 'string' ? context.stage : context.stage && context.stage.id || state.stage, 80), frame: state.frame, round: clamp(Math.floor(finite(state.round, 1)), 1, 99), phase: state.phase, finished: state.finished === true, winner: state.winner === 0 || state.winner === 1 ? state.winner : -1, eventCount: total, events };
  }
  function cueFor(event) {
    const tag = event.tag, kind = event.kind;
    if (event.type === 'activate') {
      if (kind === 'reload' || kind === 'recover' || kind === 'heal' || kind === 'detonate') return null; // Their actual result emits its own cue.
      if (kind === 'mobility') return 'dash';
      if (kind === 'parry') return 'blade';
      if (['buff', 'mark', 'trap'].includes(kind)) return 'deploy';
      if (['electric', 'emp', 'rail', 'laser', 'psychic', 'zandatsu', 'cold', 'mist'].includes(tag)) return 'energy';
      if (['drone', 'recon', 'doll', 'puppet', 'barricade', 'object', 'shield', 'armor', 'decoy'].includes(tag)) return 'deploy';
      if (['movement', 'stealth', 'hawk', 'swarm', 'voice', 'bind'].includes(tag)) return 'dash';
      if (tag === 'fire') return 'fire';
      if (tag === 'tranq') return 'tranq';
      if (['rocket', 'explosive', 'volatile'].includes(tag)) return 'launch';
      if (tag === 'ballistic' || tag === 'precision' || tag === 'bolt') return event.weapon === 'minigun' ? 'rifle' : ['pistol', 'rifle', 'sniper', 'revolver', 'shotgun'].includes(event.weapon) ? event.weapon : 'pistol';
      if (['blade', 'knife', 'spear', 'machete', 'shuriken', 'boomerang', 'tentacle', 'card'].includes(tag)) return 'blade';
      if (tag === 'grapple') return 'throw';
      return event.slot === 'heavy' || event.slot === 'super' ? 'heavy' : 'punch';
    }
    if (event.type === 'damage') return event.blocked ? null : ['explosive', 'rocket', 'volatile', 'fire'].includes(tag) ? 'heavy' : ['electric', 'rail', 'laser', 'emp'].includes(tag) ? 'energy' : event.amount >= 1000 ? 'heavy' : 'punch';
    return ({ block: 'block', parry: 'parry', reflect: 'parry', barrier: 'block', guardBreak: 'guardBreak', throwTech: 'block', explosion: 'explosion', reload: 'reload', heal: 'recover', recover: 'recover', dash: 'dash', reposition: 'energy', ricochet: 'parry', roundReset: 'round', roundEnd: event.winner < 0 ? 'draw' : 'ko', matchEnd: 'matchWin' })[event.type] || null;
  }
  function create(options) {
    options = options || {};
    let prefs = settings(options.settings), audio = null, master = null, effectsBus = null, ambienceBus = null, menuBus = null, limiter = null;
    let unlocked = false, disposed = false, paused = false, discardNext = false, session = null, lastFrame = -1, lastSeq = 0, lastPhase = '', lastRound = 0, ambience = null, wantedStage = '', voiceId = 0;
    const voices = new Map(), cache = new Map(), maxVoices = Math.round(clamp(finite(options.maxVoices, 12), 1, 16));
    const counts = { observed: 0, events: 0, played: 0, dropped: 0, stale: 0, peakVoices: 0, generated: 0 };
    let lastError = '', lastCue = '', lastFinisher = '', endedSession = null;
    const AudioCtor = options.AudioContext || scope.AudioContext || scope.webkitAudioContext;
    const usable = () => !!(audio && unlocked && audio.state === 'running' && prefs.master > 0 && !disposed);
    const audible = () => usable() && prefs.enabled && !paused;
    function gainValue(node, value) { if (!node) return; const p = node.gain; if (p.cancelScheduledValues) p.cancelScheduledValues(audio.currentTime); if (p.setTargetAtTime) p.setTargetAtTime(value, audio.currentTime, 0.015); else p.value = value; }
    function release(voice) { if (!voice || !voices.has(voice.id)) return; voices.delete(voice.id); try { voice.source.disconnect(); } catch (_) {} try { voice.gain.disconnect(); } catch (_) {} if (voice.pan) try { voice.pan.disconnect(); } catch (_) {} }
    function kill(voice) { if (!voice) return; try { voice.gain.gain.value = 0; voice.source.stop(); } catch (_) {} release(voice); }
    function stopAmbience() { if (!ambience) return; try { ambience.source.stop(); ambience.source.disconnect(); } catch (_) {} ambience = null; }
    function silence() { for (const voice of [...voices.values()]) kill(voice); stopAmbience(); }
    function bufferFor(cue, variant) {
      const key = cue + ':' + (variant % 4);
      if (cache.has(key)) return cache.get(key);
      const pcm = cue.startsWith('ambience:') ? ambienceSamples(cue.slice(9), audio.sampleRate) : synthesize(cue, audio.sampleRate, variant % 4);
      const buffer = audio.createBuffer(1, pcm.samples.length, pcm.sampleRate); buffer.getChannelData(0).set(pcm.samples); cache.set(key, buffer); counts.generated++;
      // Six ambience loops and at most 4 variants per cue. No per-frame allocations retained.
      if (cache.size > 118) cache.delete(cache.keys().next().value);
      return buffer;
    }
    function refreshAmbience() {
      const family = stageFamily(wantedStage);
      if (!audible() || prefs.ambience <= 0 || !wantedStage) { stopAmbience(); return; }
      if (ambience && ambience.family === family) return;
      stopAmbience();
      try { const source = audio.createBufferSource(); source.buffer = bufferFor('ambience:' + family, 0); source.loop = true; source.connect(ambienceBus); source.start(audio.currentTime); ambience = { source, family }; } catch (error) { lastError = 'Ambiance indisponible : ' + error.message; }
    }
    function play(cue, event, menuOnly) {
      if (menuOnly ? !usable() || !prefs.menuEnabled : !audible() || prefs.effects <= 0) return false;
      try {
        for (const voice of [...voices.values()]) if (voice.ends <= audio.currentTime) kill(voice);
        if (voices.size >= maxVoices) { kill(voices.values().next().value); counts.dropped++; }
        const id = ++voiceId, source = audio.createBufferSource(), gain = audio.createGain();
        source.buffer = bufferFor(cue, id); gain.gain.value = 0.62;
        source.connect(gain); let pan = null;
        if (audio.createStereoPanner) { pan = audio.createStereoPanner(); pan.pan.value = event && event.actor === 0 ? -0.27 : event && event.actor === 1 ? 0.27 : 0; gain.connect(pan); pan.connect(menuOnly ? menuBus : effectsBus); } else gain.connect(menuOnly ? menuBus : effectsBus);
        const voice = { id, source, gain, pan, menuOnly: !!menuOnly, ends: audio.currentTime + source.buffer.duration };
        voices.set(id, voice); source.onended = () => release(voice); source.start(audio.currentTime);
        counts.played++; counts.peakVoices = Math.max(counts.peakVoices, voices.size); lastCue = cue; return true;
      } catch (error) { lastError = 'Effet indisponible : ' + error.message; return false; }
    }
    function prime(packet) { session = packet.session; lastFrame = packet.frame; lastSeq = packet.eventCount; lastPhase = packet.phase; lastRound = packet.round; }
    function observe(state, context) {
      if (disposed) return false;
      const packet = snapshot(state, context); if (!packet) { counts.stale++; return false; }
      if (endedSession !== null && endedSession === packet.session) return false;
      counts.observed++; wantedStage = packet.stage || wantedStage;
      if (context && typeof context.paused === 'boolean' && context.paused !== paused) pause(context.paused);
      const differentSession = session !== packet.session;
      if (!differentSession && (packet.frame < lastFrame || packet.eventCount < lastSeq)) { counts.stale++; return false; }
      if (differentSession) {
        silence(); prime(packet); lastFinisher = ''; endedSession = null;
        if (audible() && !discardNext && packet.frame <= 2 && packet.phase === 'intro') play('round');
        discardNext = false; refreshAmbience(); return true;
      }
      if (discardNext) { prime(packet); discardNext = false; refreshAmbience(); return true; }
      const current = packet.events.filter(e => e.seq > lastSeq && e.frame >= lastFrame);
      const candidates = current.map(e => ({ e, cue: cueFor(e) })).filter(x => x.cue);
      counts.events += current.length;
      // Bursts are bounded, and old events from a throttled tab are consumed silently.
      const timely = candidates.filter(x => packet.frame - x.e.frame <= 6).slice(-8);
      if (audible()) {
        if (lastPhase === 'intro' && packet.phase === 'fight' && packet.round === lastRound) play('fight');
        for (const item of timely) play(item.cue, item.e);
      }
      prime(packet); refreshAmbience(); return true;
    }
    function pause(value) { const next = value !== false; if (next === paused) return; paused = next; silence(); if (!next) discardNext = true; }
    function end() { stopAmbience(); wantedStage = ''; endedSession = session; }
    function stop() { silence(); endedSession = null; session = null; lastFrame = -1; lastSeq = 0; lastPhase = ''; lastRound = 0; wantedStage = ''; lastFinisher = ''; discardNext = true; }
    function setSettings(value) {
      const previous = prefs; prefs = settings(value, prefs);
      gainValue(master, prefs.master); gainValue(effectsBus, prefs.enabled ? prefs.effects : 0); gainValue(ambienceBus, prefs.enabled ? prefs.ambience : 0); gainValue(menuBus, prefs.menuEnabled ? 0.35 : 0);
      if (prefs.master <= 0) silence();
      else {
        for (const voice of [...voices.values()]) if (voice.menuOnly ? !prefs.menuEnabled : !prefs.enabled || prefs.effects <= 0) kill(voice);
        if (!prefs.enabled) stopAmbience();
      }
      if ((!previous.enabled && prefs.enabled) || (previous.master <= 0 && prefs.master > 0) || (previous.effects <= 0 && prefs.effects > 0)) discardNext = true;
      refreshAmbience(); return { ...prefs };
    }
    function unlock(event) {
      if (disposed || !event || event.isTrusted !== true || !['click', 'pointerdown', 'pointerup', 'mousedown', 'touchend', 'keydown'].includes(event.type) || event.type === 'keydown' && !['Enter', ' ', 'Space', 'Spacebar'].includes(event.key) && !['Enter', 'Space'].includes(event.code)) return Promise.resolve(false);
      if (!AudioCtor) { lastError = 'Web Audio indisponible'; return Promise.resolve(false); }
      try {
        if (!audio) {
          audio = new AudioCtor(); master = audio.createGain(); effectsBus = audio.createGain(); ambienceBus = audio.createGain(); menuBus = audio.createGain();
          master.gain.value = prefs.master; effectsBus.gain.value = prefs.enabled ? prefs.effects : 0; ambienceBus.gain.value = prefs.enabled ? prefs.ambience : 0; menuBus.gain.value = prefs.menuEnabled ? 0.35 : 0;
          effectsBus.connect(master); ambienceBus.connect(master); menuBus.connect(master);
          if (audio.createDynamicsCompressor) { limiter = audio.createDynamicsCompressor(); limiter.threshold.value = -8; limiter.knee.value = 4; limiter.ratio.value = 12; limiter.attack.value = 0.003; limiter.release.value = 0.15; master.connect(limiter); limiter.connect(audio.destination); } else master.connect(audio.destination);
        }
        // resume is invoked synchronously in the trusted handler, before awaiting anything.
        const promise = audio.state === 'suspended' ? audio.resume() : Promise.resolve();
        return Promise.resolve(promise).then(() => { if (disposed) return false; unlocked = audio.state === 'running'; if (unlocked) { lastError = ''; discardNext = true; refreshAmbience(); } return unlocked; }).catch(error => { lastError = 'Activation audio refusée : ' + error.message; return false; });
      } catch (error) { lastError = 'Activation audio indisponible : ' + error.message; return Promise.resolve(false); }
    }
    function menu() { return play('menu', null, true); }
    function finisher(id, event) { const key = text(id, 180); if (!key || key === lastFinisher || !audible()) return false; lastFinisher = key; return play('finisher', event); }
    function dispose() { if (disposed) return; stop(); disposed = true; unlocked = false; cache.clear(); for (const node of [effectsBus, ambienceBus, menuBus, master, limiter]) if (node) try { node.disconnect(); } catch (_) {} if (audio && audio.close) try { Promise.resolve(audio.close()).catch(() => {}); } catch (_) {} }
    function diagnostics() { return { version: VERSION, supported: !!AudioCtor, unlocked, enabled: prefs.enabled, paused, disposed, contextState: audio ? audio.state : 'uncreated', voices: voices.size, maxVoices, cachedBuffers: cache.size, ambience: ambience ? ambience.family : null, sampleRate: audio ? audio.sampleRate : null, session, ended: endedSession !== null, lastFrame, lastSequence: lastSeq, lastCue, error: lastError, settings: { ...prefs }, ...counts }; }
    return Object.freeze({ unlock, setSettings, observe, pause, stop, end, finish: end, finisher, menu, dispose, diagnostics });
  }
  const API = Object.freeze({ version: VERSION, defaults: DEFAULTS, cues: CUES, stageFamilies: STAGE_FAMILIES, create, snapshot, synthesize, ambienceSamples, cueFor });
  scope.CQC_AUDIO_058 = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
