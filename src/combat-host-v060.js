/* Connect the optional sound and round presentation to an actual running duel.
 * The combat engine calls these lifecycle methods; this host owns no game clock.
 */
(function (root) {
  'use strict';
  // A code remains held until every physical/virtual source releases it. This
  // coordinator owns no DOM event, polling clock or combat state.
  function createSources() {
    const owners = new Map(), codes = new Map();
    const valid = value => typeof value === 'string' && value.length > 0 && value.length <= 160;
    function press(source, code) {
      if (!valid(source) || !valid(code)) return false;
      let held = owners.get(source);
      if (held?.has(code)) return false;
      if (!held) owners.set(source, held = new Set());
      held.add(code);
      let sources = codes.get(code);
      const first = !sources;
      if (!sources) codes.set(code, sources = new Set());
      sources.add(source);
      return first;
    }
    function release(source, code) {
      const held = owners.get(source);
      if (!held?.delete(code)) return false;
      if (!held.size) owners.delete(source);
      const sources = codes.get(code);
      sources.delete(source);
      if (sources.size) return false;
      codes.delete(code);
      return true;
    }
    function releaseSource(source) {
      const released = [];
      for (const code of [...(owners.get(source) || [])]) if (release(source, code)) released.push(code);
      return released;
    }
    function clear() {
      const released = [...codes.keys()];
      owners.clear(); codes.clear();
      return released;
    }
    return Object.freeze({press, release, releaseSource, clear, has:code=>codes.has(code),
      snapshot:()=>({codes:[...codes.keys()].sort(), sources:[...owners].map(([source,held])=>({source,codes:[...held].sort()}))})});
  }
  root.CQC_INPUT_060 = Object.freeze({version:'0.60',createSources});
  function create(options) {
    const A = root.CQC_AUDIO_058, story = options.story === true;
    const audio = story ? null : A?.create();
    let sequence = 0, session = '', subscribed = false, lastPacket = '', ended = false;
    let portraitIds = '', portraits = [], returnFocus = null, previousPause = true, panel = null;
    let panelState = null, panelRevision = 0, panelInterrupted = false;
    let prefs = { ...A?.defaults }, buttons = [];
    if (!story) {
      try { const saved = JSON.parse(localStorage.getItem('re.bow.audio058') || 'null'); if (saved && typeof saved === 'object') prefs = audio?.setSettings(saved) || prefs; } catch (_) {}
    }
    const state = () => options.getState();
    const isPaused = () => options.isPaused();
    const token = () => options.getToken();
    const pauseRevision = () => options.getPauseRevision?.() ?? 0;
    const isModalOpen = () => !!panel && !panel.classList.contains('hidden');
    function persist() { try { localStorage.setItem('re.bow.audio058', JSON.stringify(prefs)); } catch (_) {} }
    function status() {
      const d = audio?.diagnostics();
      for (const button of buttons) {
        button.textContent = prefs.enabled && d?.unlocked ? 'SON : ACTIF' : 'SON';
        button.setAttribute('aria-label', 'Régler les sons du combat');
      }
      if (panel) {
        const room=root.RE_BAKER_AMBIENCE?.describe(state()?.stage);
        panel.querySelector('#audioRoomR15').textContent=room?room.name+' · '+room.provenance:'Ambiance générique du prototype pour cette arène.';
        const toggle = panel.querySelector('#audioToggle58');
        toggle.textContent = prefs.enabled && d?.unlocked ? 'Couper le son' : 'Activer le son';
        toggle.setAttribute('aria-pressed', String(!!(prefs.enabled && d?.unlocked)));
        panel.querySelector('#audioStatus58').textContent = d?.error || (prefs.enabled && d?.unlocked ? 'Sons actifs. Les trois volumes sont indépendants.' : 'Activez le son ici pour cette session.');
      }
    }
    function closePanel(restore = true) {
      if (!isModalOpen()) return;
      panel.classList.add('hidden');
      const sameDuel = panelState === state();
      const canRestore = restore && sameDuel && !panelInterrupted && panelRevision === pauseRevision();
      if (canRestore && options.isRunning()) options.pause(previousPause, 'restore');
      if (restore) returnFocus?.focus();
      returnFocus = null; panelState = null; panelInterrupted = false;
    }
    function openPanel(event) {
      if (!panel || isModalOpen()) return;
      returnFocus = event?.currentTarget || document.activeElement;
      previousPause = isPaused();
      panelState = state(); panelInterrupted = false;
      if (options.isRunning()) options.pause(true, 'modal');
      panelRevision = pauseRevision();
      panel.classList.remove('hidden'); status(); panel.querySelector('#audioToggle58').focus();
    }
    function mount() {
      if (story || !audio) return;
      const css = document.createElement('style');
      css.textContent = '.audio-panel58{position:fixed;inset:0;z-index:60;background:#030c12ed;display:grid;place-items:center;padding:20px}.audio-card58{width:min(540px,94vw);max-height:88vh;overflow:auto;background:#0d2028;border:1px solid #6b9296;padding:26px;color:#e8ece4;box-shadow:0 24px 80px #0008}.audio-card58 h2{margin:0 0 10px;font-size:27px}.audio-card58 p{font-size:13px;line-height:1.5;color:#b9c6c5}.audio-card58 label{display:grid;grid-template-columns:1fr 50px;gap:8px;margin:20px 0;font-size:14px}.audio-card58 input{grid-column:1/3;width:100%;accent-color:#9dd9ce}.audio-card58 output{text-align:right}.audio-card58 button{min-height:42px;background:#183a3d;border:1px solid #7da4a0;padding:10px 16px;color:#ecf1e9;font-weight:700}.audio-card58 .audio-actions58{display:flex;gap:10px;flex-wrap:wrap}.audio-open58{white-space:nowrap}.audio-panel58.hidden{display:none}';
      document.head.appendChild(css);
      panel = document.createElement('section'); panel.id = 'audioPanel58'; panel.className = 'audio-panel58 hidden';
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'audioTitle58');
      panel.innerHTML = '<div class="audio-card58"><h2 id="audioTitle58">Sons du combat</h2><p id="audioStatus58" role="status"></p><div class="audio-actions58"><button id="audioToggle58" type="button">Activer le son</button><button id="audioClose58" type="button">Revenir au jeu</button></div><label for="audioMaster58">Volume général<output id="audioMasterValue58"></output><input id="audioMaster58" type="range" min="0" max="100" step="1"></label><label for="audioEffects58">Coups et annonces<output id="audioEffectsValue58"></output><input id="audioEffects58" type="range" min="0" max="100" step="1"></label><label for="audioAmbience58">Ambiance de l’arène<output id="audioAmbienceValue58"></output><input id="audioAmbience58" type="range" min="0" max="100" step="1"></label><p id="audioRoomR15"></p><p>Les sons restent facultatifs. Une pause suspend les effets et l’ambiance.</p></div>';
      document.body.appendChild(panel);
      for (const [id, key] of [['Master','master'],['Effects','effects'],['Ambience','ambience']]) {
        const range = panel.querySelector('#audio' + id + '58'), output = panel.querySelector('#audio' + id + 'Value58');
        range.value = Math.round(prefs[key] * 100); output.textContent = range.value + ' %';
        range.addEventListener('input', () => { const value = Math.min(100, Math.max(0, Number(range.value))); if (!Number.isFinite(value)) return; prefs = audio.setSettings({[key]: value / 100}); output.textContent = value + ' %'; persist(); });
      }
      panel.querySelector('#audioToggle58').addEventListener('click', event => {
        if (prefs.enabled && audio.diagnostics().unlocked) { prefs = audio.setSettings({enabled:false}); persist(); status(); return; }
        // unlock is called synchronously from the actual activation event.
        const activation = audio.unlock(event);
        Promise.resolve(activation).then(ok => { if (ok) prefs = audio.setSettings({enabled:true}); persist(); status(); });
      });
      panel.querySelector('#audioClose58').addEventListener('click', () => closePanel());
      panel.addEventListener('keydown', event => {
        event.stopPropagation();
        if (event.code === 'Escape') { event.preventDefault(); closePanel(); }
        else if (event.code === 'Tab') {
          const controls = [...panel.querySelectorAll('button,input')].filter(el => !el.disabled);
          const index = controls.indexOf(document.activeElement), next = (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
          event.preventDefault(); controls[next]?.focus();
        }
      });
      for (const target of document.querySelectorAll('#selectScreen .top-actions, #fightScreen .game-head')) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'audio-open58';
        button.addEventListener('click', openPanel); target.appendChild(button); buttons.push(button);
      }
      status();
    }
    function preparePortraits(s) {
      const ids = s.a.f.uid + ':' + s.b.f.uid;
      if (portraitIds === ids) return;
      portraitIds = ids;
      portraits = [s.a, s.b].map(actor => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 172;
        root.CQC_PRESENTATION_058?.portrait(canvas, actor.f);
        return canvas;
      });
    }
    function packet(force) {
      const s = state(); if (!s || ended || !A) return;
      if (story && (!subscribed || !token())) return;
      const count = Object.values(s.metrics || {}).reduce((sum, value) => sum + value, 0);
      const key = session + ':' + s.frame + ':' + count + ':' + s.phase + ':' + s.finished;
      if (!force && key === lastPacket) return;
      lastPacket = key;
      const snap = A.snapshot(s, {session, stage:s.stage.id}); if (!snap) return;
      if (story) parent.postMessage({type:'cqc55.audio', token:token(), snapshot:snap}, '*');
      else audio?.observe(snap, {session, stage:s.stage.id, paused:isPaused()});
    }
    function start(s) {
      closePanel(false);
      session = story ? token() : 'versus58-' + (++sequence);
      subscribed = false; lastPacket = ''; ended = false;
      audio?.stop(); audio?.pause(false); preparePortraits(s); packet(true);
    }
    function pause(on) { audio?.pause(on); if (!on) packet(true); }
    function abort() { closePanel(false); audio?.stop(); subscribed = false; lastPacket = ''; ended = true; }
    function end() { closePanel(false); packet(true); ended = true; if (audio?.end) audio.end(); else audio?.stop(); }
    function finisher(id, actor) {
      if (story) { if (subscribed && token()) parent.postMessage({type:'cqc55.audioFinisher',token:token(),id:String(id || '').slice(0,120),actor}, '*'); }
      else audio?.finisher(session + ':' + id, {actor});
    }
    function draw(c, s, flowOptions) {
      const ready = portraits.map(canvas => canvas.dataset.portraitReady === 'true' ? canvas : null);
      return root.CQC_DEFEAT_060?.draw(c,s,flowOptions)||root.CQC_FLOW_058?.draw(c, s, {...flowOptions, portraits:ready});
    }
    if (story) root.addEventListener('message', event => {
      const message = event.data || {};
      if (event.source !== parent || message.type !== 'cqc55.audioSubscribe' || !token() || message.token !== token() || typeof message.enabled !== 'boolean') return;
      subscribed = message.enabled; lastPacket = ''; if (subscribed) packet(true);
    });
    root.addEventListener('blur', () => { if (isModalOpen()) panelInterrupted = true; });
    document.addEventListener('visibilitychange', () => { if (document.hidden && isModalOpen()) panelInterrupted = true; });
    root.addEventListener('pagehide', event => {
      if (event.persisted) { closePanel(false); audio?.park(); lastPacket = ''; }
      else { abort(); audio?.dispose(); }
    });
    root.addEventListener('pageshow', event => { if (event.persisted) { audio?.pause(true); lastPacket = ''; status(); } });
    mount();
    return {start, step:packet, pause, abort, end, finisher, draw, audio, isModalOpen,
      diagnostics:() => ({session, subscribed, ended, modalOpen:isModalOpen(), portraits:portraitIds, audio:audio?.diagnostics() || null})};
  }
  root.CQC_HOST_060 = root.CQC_HOST_059 = root.CQC_HOST_058 = {create};
})(window);
