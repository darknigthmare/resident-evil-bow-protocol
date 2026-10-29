(function () {
  'use strict';
  const $ = id => document.getElementById(id), root = new URL('../../../', location.href);
  let report = null, token = 0, monitor = null;
  function api() {try {return $('game').contentWindow.RE_PERFORMANCE_R31;} catch {return null;}}
  function controls() {
    const current = api(), available = !!monitor && current === monitor, active = available && monitor.state().active;
    $('measure').disabled = !available || active; $('stop').disabled = !active;
  }
  function clearReport() {report = null; $('results').replaceChildren(); $('download').disabled = true;}
  function render(value) {
    report = value;
    const rows = [['Durée observée', Math.round(value.durationMs) + ' ms'], ['Intervalles de callbacks', value.callbackIntervals],
        ['Intervalle médian', value.medianCallbackMs === null ? 'Indisponible' : value.medianCallbackMs.toFixed(2) + ' ms'],
        ['Intervalle au 95e percentile', value.p95CallbackMs === null ? 'Indisponible' : value.p95CallbackMs.toFixed(2) + ' ms'],
        ['Tâches longues', value.longTasksSupported ? value.longTasks : 'Observation non prise en charge'],
        ['Pixels réservés par les lecteurs coordonnés', value.managedImages?.reservedPixels ?? 'Indisponible'],
        ['Ticks du même combat', value.observedEngineTicks ?? 'Aucun combat continu pendant la mesure']];
    $('results').replaceChildren(...rows.flatMap(([name, text]) => {const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = name; dd.textContent = String(text); return [dt, dd];}));
    $('download').disabled = false; $('status').textContent = 'Relevé disponible. Fin : ' + value.reason + '.';
  }
  function ready() {
    token++; const current = api(); if (monitor && current !== monitor) monitor.stop('frame-change');
    monitor = current || null; clearReport(); controls();
    $('status').textContent = monitor ? (monitor.state().active ? 'Mesure en cours. Vous pouvez jouer dans le cadre.'
      : 'Mode prêt. Lancez une mesure lorsque vous souhaitez observer cette session.') : 'Le suivi de cette page est indisponible.';
  }
  function load() {token++; monitor?.stop('mode-change'); monitor = null; clearReport(); controls();
    $('status').textContent = 'Ouverture du mode…'; $('game').src = new URL($('mode').value, root).href;}
  $('game').addEventListener('load', ready);
  $('mode').addEventListener('change', load);
  $('measure').addEventListener('click', async () => {
    const current = api(), revision = token; if (!current || current !== monitor) return;
    const ownsReport = () => revision === token && current === monitor && current === api();
    $('measure').disabled = true; $('stop').disabled = false; $('status').textContent = 'Mesure en cours. Vous pouvez jouer dans le cadre.';
    try {
      const value = await current.start({durationMs: Number($('duration').value)}); if (ownsReport()) render(value);
    } catch (error) {if (ownsReport()) $('status').textContent = error.message;}
    finally {if (ownsReport()) controls();}
  });
  $('stop').addEventListener('click', () => api()?.stop('manual'));
  $('download').addEventListener('click', () => {
    if (!report) return; const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2) + '\n'], {type: 'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = 'bow-session-r31.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  addEventListener('pagehide', () => {
    token++; const current = api();
    if (current && current === monitor) {const value = current.stop('parent-pagehide'); if (value) render(value);}
    controls();
  });
  addEventListener('pageshow', event => {
    if (!event.persisted) return;
    if (api() !== monitor) return ready();
    const value = monitor?.stop('parent-pageshow'); if (value) render(value); controls();
  });
  load();
})();
