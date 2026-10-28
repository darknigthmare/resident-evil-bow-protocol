/* Voluntary timing observations. This records browser callbacks, never game commands. */
(function (root) {
  'use strict';
  if (root.RE_PERFORMANCE_R31 || !root.performance?.now) return;
  let session = null, last = null;
  const engine = () => (root.RE_CATALOG_DUEL || root.RE_COMBAT)?.getState?.() || null;
  const quantile = (values, ratio) => values.length ? values.slice().sort((a, b) => a - b)[Math.floor((values.length - 1) * ratio)] : null;
  function result(item, reason) {
    const now = root.performance.now(), state = engine(), same = !!state && state === item.engine;
    return Object.freeze({schema: 're.bow.browser-session-r31/1', durationMs: Math.max(0, now - item.start), reason,
      callbackIntervals: item.intervals.length, medianCallbackMs: quantile(item.intervals, .5), p95CallbackMs: quantile(item.intervals, .95),
      longestCallbackMs: item.intervals.length ? Math.max(...item.intervals) : null,
      longTasksSupported: item.observer !== null, longTasks: item.longTasks.length,
      longTaskTotalMs: item.longTasks.reduce((sum, duration) => sum + duration, 0),
      sameEngineSession: same, observedEngineTicks: same && state ? Math.max(0, state.frame - item.frame) : null,
      managedImages: root.RE_IMAGE_BUDGET_R31?.state() || null,
      nativeRenderer: root.RE_NATIVE_ADAPTER_R30?.state() || null,
      physicalDeviceCertified: false, gpuAllocationsMeasured: false,
      scope: 'RequestAnimationFrame intervals and supported long tasks in this browser session; not physical display FPS or total browser/GPU memory.'});
  }
  function stop(reason = 'manual') {
    if (!session) return last;
    const item = session; session = null; root.cancelAnimationFrame?.(item.raf); root.clearTimeout(item.timer); item.observer?.disconnect();
    last = result(item, reason); item.resolve(last); return last;
  }
  function start(options = {}) {
    if (session) return Promise.reject(Error('Une mesure est déjà en cours.'));
    if (root.document?.hidden || typeof root.requestAnimationFrame !== 'function') return Promise.reject(Error('Afficher cette page pour mesurer une session.'));
    const duration = options.durationMs ?? 10000;
    if (!Number.isSafeInteger(duration) || duration < 1000 || duration > 60000) return Promise.reject(Error('Durée de mesure hors limites.'));
    const state = engine(), item = {start: root.performance.now(), previous: null, intervals: [], longTasks: [], observer: null,
      engine: state, frame: state?.frame || 0, raf: null, timer: null, resolve: null};
    const promise = new Promise(resolve => {item.resolve = resolve;}); session = item;
    if (root.PerformanceObserver?.supportedEntryTypes?.includes('longtask')) {
      try {
        item.observer = new root.PerformanceObserver(list => {
          if (session !== item) return;
          for (const entry of list.getEntries()) if (item.longTasks.length < 256 && Number.isFinite(entry.duration)) item.longTasks.push(entry.duration);
        });
        item.observer.observe({type: 'longtask', buffered: false});
      } catch {item.observer?.disconnect(); item.observer = null;}
    }
    function frame(time) {
      if (session !== item) return;
      if (item.previous !== null && item.intervals.length < 7200) item.intervals.push(Math.max(0, time - item.previous));
      item.previous = time; item.raf = root.requestAnimationFrame(frame);
    }
    item.raf = root.requestAnimationFrame(frame); item.timer = root.setTimeout(() => stop('duration'), duration); return promise;
  }
  root.RE_PERFORMANCE_R31 = Object.freeze({start, stop, state: () => ({active: session !== null, last,
    sampleLimit: 7200, longTaskLimit: 256, engineMutations: false})});
  root.document?.addEventListener('visibilitychange', () => {if (root.document.hidden) stop('hidden');});
  root.addEventListener?.('pagehide', () => stop('pagehide'));
})(globalThis);
