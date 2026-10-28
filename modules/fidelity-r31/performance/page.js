(function () {
  'use strict';
  const $ = id => document.getElementById(id), root = new URL('../../../', location.href);
  let report = null, token = 0;
  function api() {try {return $('game').contentWindow.RE_PERFORMANCE_R31;} catch {return null;}}
  function load() {token++; api()?.stop('mode-change'); $('measure').disabled = true; $('stop').disabled = true;
    $('status').textContent = 'Ouverture du mode…'; $('game').src = new URL($('mode').value, root).href;}
  $('game').addEventListener('load', () => {$('measure').disabled = !api(); $('status').textContent = api()
    ? 'Mode prêt. Lancez une mesure lorsque vous souhaitez observer cette session.' : 'Le suivi de cette page est indisponible.';});
  $('mode').addEventListener('change', load);
  $('measure').addEventListener('click', async () => {
    const current = api(), revision = token; if (!current) return;
    $('measure').disabled = true; $('stop').disabled = false; $('status').textContent = 'Mesure en cours. Vous pouvez jouer dans le cadre.';
    try {
      const value = await current.start({durationMs: Number($('duration').value)}); if (revision !== token) return; report = value;
      const rows = [['Durée observée', Math.round(value.durationMs) + ' ms'], ['Intervalles de callbacks', value.callbackIntervals],
        ['Intervalle médian', value.medianCallbackMs === null ? 'Indisponible' : value.medianCallbackMs.toFixed(2) + ' ms'],
        ['Intervalle au 95e percentile', value.p95CallbackMs === null ? 'Indisponible' : value.p95CallbackMs.toFixed(2) + ' ms'],
        ['Tâches longues', value.longTasksSupported ? value.longTasks : 'Observation non prise en charge'],
        ['Pixels réservés par les lecteurs coordonnés', value.managedImages?.reservedPixels ?? 'Indisponible'],
        ['Ticks du même combat', value.observedEngineTicks ?? 'Aucun combat continu pendant la mesure']];
      $('results').replaceChildren(...rows.flatMap(([name, text]) => {const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = name; dd.textContent = String(text); return [dt, dd];}));
      $('download').disabled = false; $('status').textContent = 'Relevé disponible. Fin : ' + value.reason + '.';
    } catch (error) {$('status').textContent = error.message;}
    finally {if (revision === token) {$('measure').disabled = false; $('stop').disabled = true;}}
  });
  $('stop').addEventListener('click', () => api()?.stop('manual'));
  $('download').addEventListener('click', () => {
    if (!report) return; const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2) + '\n'], {type: 'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = 'bow-session-r31.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  addEventListener('pagehide', () => {token++; api()?.stop('parent-pagehide');}); load();
})();
