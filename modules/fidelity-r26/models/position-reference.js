/* A review position is bound to the exact published file, never an action alias. */
const identifier = /^[a-z0-9-]{1,160}$/;
const clipIdentifier = /^[A-Za-z0-9_.-]{1,200}$/;
const sha = /^[a-f0-9]{64}$/;
export function positionURL(page, entry, clip, time) {
  if (!(page instanceof URL) || !['http:', 'https:'].includes(page.protocol) || !identifier.test(entry?.id)
    || (clip && !clipIdentifier.test(clip.id)) || !sha.test((clip || entry.model)?.sha256)
    || !Number.isFinite(time) || time < 0 || (!clip && time !== 0)) throw Error('Position source invalide.');
  const result = new URL(page.href); result.search = ''; result.hash = '';
  result.searchParams.set('model', entry.id);
  if (clip) result.searchParams.set('clip', clip.id);
  result.searchParams.set('time', String(time)); result.searchParams.set('source', (clip || entry.model).sha256);
  return result;
}
export function requestedPosition(page, entry, clip, duration) {
  const values = page.searchParams, time = values.get('time'), digest = values.get('source');
  if (time === null && digest === null) return {status: 'none', message: ''};
  const refuse = message => ({status: 'refused', message: message + ' La source reste consultable depuis son début, en pause.'});
  if (['model','clip','time','source'].some(key => values.getAll(key).length > 1)) return refuse('Le lien contient des positions ambiguës.');
  if (values.get('model') !== entry.id || (clip?.id || null) !== values.get('clip')) return refuse('Le sujet ou le mouvement du lien ne correspond pas à la sélection.');
  if (!sha.test(digest || '') || digest !== (clip || entry.model).sha256) return refuse('L’empreinte du lien diffère du fichier source actuel.');
  if (typeof time !== 'string' || time.length > 32 || !/^(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(time)) return refuse('La position du lien est invalide.');
  const seconds = Number(time);
  if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(duration) || seconds > duration || (!clip && seconds !== 0)) return refuse('La position demandée sort de ce fichier source.');
  return {status: 'accepted', time: seconds, message: 'Position restaurée après vérification de l’empreinte du fichier. La lecture reste en pause.'};
}
