/* Bounded, SHA-verified reader for the source-motion study. No game/save API. */
const repository = new URL('../../../', import.meta.url);
const limits = Object.freeze({manifestBytes: 16 * 1024 * 1024, imageBytes: 8 * 1024 * 1024,
  imagePixels: 2048 * 2048, decodedImages: 4, decodedPixels: 16 * 1024 * 1024, concurrentImages: 2});
const hash = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
export function local(value, extension = 'png') {
  if (typeof value !== 'string' || !value.startsWith('modules/fidelity-r31/motion/')
      || !new RegExp('^[A-Za-z0-9_./-]+\\.' + extension + '$').test(value)
      || value.split('/').some(part => !part || part === '.' || part === '..')) throw Error('Chemin de source invalide.');
  const url = new URL(value, repository);
  if (url.origin !== repository.origin || !url.pathname.startsWith(repository.pathname)) throw Error('La source sort de cette livraison.');
  return url.href;
}
async function bounded(response, maximum, expected, signal) {
  if (!response.ok || response.type === 'opaque') throw Error('Source indisponible.');
  const length = response.headers.get('content-length');
  if (length !== null && (!Number.isSafeInteger(Number(length)) || Number(length) < 0 || Number(length) > maximum
      || expected !== undefined && Number(length) !== expected)) throw Error('Taille déclarée invalide.');
  const reader = response.body?.getReader(); if (!reader) throw Error('Lecture bornée indisponible.');
  const chunks = []; let total = 0;
  try {
    for (;;) {
      if (signal?.aborted) throw Error('Lecture annulée.');
      const part = await reader.read(); if (part.done) break;
      total += part.value.byteLength;
      if (total > maximum || expected !== undefined && total > expected) throw Error('Source trop volumineuse.');
      chunks.push(part.value);
    }
  } catch (error) {await reader.cancel().catch(() => {}); throw error;}
  finally {reader.releaseLock();}
  if (expected !== undefined && total !== expected) throw Error('Source tronquée.');
  const raw = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) {raw.set(chunk, offset); offset += chunk.byteLength;} return raw;
}
export async function json(record, signal) {
  const raw = await bounded(await fetch(local(record.path, 'json'), {signal, credentials: 'same-origin'}), limits.manifestBytes, record.bytes, signal);
  if (record.sha256 && await hash(raw) !== record.sha256) throw Error('Empreinte du manifeste divergente.');
  return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(raw));
}
export function validateEntry(entry) {
  if (!entry || !/^[a-z0-9][a-zA-Z0-9_-]{0,220}$/.test(entry.id || '') || typeof entry.subjectId !== 'string'
      || !['native-sequence', 'native-root-follow-inspection'].includes(entry.kind)
      || entry.canMirror !== false || entry.originalGameFrames !== false || entry.canonicalFidelityCertified !== false
      || entry.admittedTargetEdition !== false || !Array.isArray(entry.admittedCombatStates) || entry.admittedCombatStates.length
      || !Array.isArray(entry.frames) || entry.frames.length !== entry.frameCount || entry.frames.length < 60 || entry.frames.length > 36000
      || entry.sampleRate !== 60 || entry.fullNativeDuration !== true || !Number.isFinite(entry.durationSeconds)
      || Math.abs(entry.durationSeconds * 60 - entry.frames.length) > 1e-8) throw Error('Contrat de séquence invalide.');
  for (const [index, frame] of entry.frames.entries()) {
    local(frame.path);
    if (!Number.isFinite(frame.seconds) || Math.abs(frame.seconds - index / 60) > 1e-8
        || frame.width !== 384 || frame.height !== 384 || !/^[a-f0-9]{64}$/.test(frame.sha256)
        || !Number.isInteger(frame.bytes) || frame.bytes < 1 || frame.bytes > limits.imageBytes) throw Error('Image native invalide.');
    if (frame.atlas) {
      const atlas = frame.atlas, rect = frame.rect; local(atlas.path);
      if (!Number.isInteger(atlas.width) || !Number.isInteger(atlas.height) || atlas.width < 1 || atlas.height < 1
          || atlas.width > 2048 || atlas.height > 2048 || atlas.width * atlas.height > limits.imagePixels
          || !Number.isInteger(atlas.bytes) || atlas.bytes < 1 || atlas.bytes > limits.imageBytes || !/^[a-f0-9]{64}$/.test(atlas.sha256)
          || !rect || !Number.isInteger(rect.x) || !Number.isInteger(rect.y) || rect.x < 0 || rect.y < 0
          || rect.width !== 384 || rect.height !== 384 || rect.x + 384 > atlas.width || rect.y + 384 > atlas.height) throw Error('Cellule d’atlas invalide.');
    }
  }
  return entry;
}
export class Images {
  constructor() {this.cache = new Map(); this.queue = []; this.controllers = new Set(); this.loading = 0; this.clock = 0; this.generation = 0; this.active = true;}
  state() {const ready = [...this.cache.values()].filter(value => value.image); return {loading: this.loading, queued: this.queue.length,
    cached: ready.length, decodedPixels: ready.reduce((n, value) => n + value.record.width * value.record.height, 0), limits};}
  key(record) {return record.path + ':' + record.sha256;}
  dispose(value) {value.controller?.abort(); if (value.url) URL.revokeObjectURL(value.url); value.image?.removeAttribute('src'); value.image = null; value.url = null;}
  trim(protectedKey) {
    const ready = [...this.cache].filter(([, value]) => value.image).sort((a, b) => a[1].used - b[1].used);
    let pixels = ready.reduce((n, [, value]) => n + value.record.width * value.record.height, 0), count = ready.length;
    for (const [key, value] of ready) {
      if (count <= limits.decodedImages && pixels <= limits.decodedPixels) break;
      if (key === protectedKey) continue;
      this.cache.delete(key); count--; pixels -= value.record.width * value.record.height; this.dispose(value);
    }
  }
  load(record) {
    if (!this.active) return Promise.reject(Error('Lecteur suspendu.'));
    const key = this.key(record), previous = this.cache.get(key);
    if (previous) {previous.used = ++this.clock; return previous.promise;}
    if (this.queue.length >= 8) return Promise.reject(Error('File de lecture pleine.'));
    const value = {record, used: ++this.clock, image: null, url: null, controller: null};
    value.promise = new Promise((resolve, reject) => {value.resolve = resolve; value.reject = reject;});
    this.cache.set(key, value); this.queue.push(value); this.pump(); return value.promise;
  }
  pump() {
    while (this.active && this.loading < limits.concurrentImages && this.queue.length) {
      const value = this.queue.shift(), controller = new AbortController(), generation = this.generation;
      const record = value.record, key = this.key(record); value.controller = controller;
      this.controllers.add(controller); this.loading++;
      (async () => {
        const raw = await bounded(await fetch(local(record.path), {signal: controller.signal, credentials: 'same-origin'}), limits.imageBytes, record.bytes, controller.signal);
        if (await hash(raw) !== record.sha256) throw Error('Empreinte PNG divergente.');
        if (!this.active || generation !== this.generation || controller.signal.aborted) throw Error('Décodage annulé.');
        value.url = URL.createObjectURL(new Blob([raw], {type: 'image/png'})); const image = new Image();
        await new Promise((resolve, reject) => {
          const cleanup = () => {image.onload = image.onerror = null; controller.signal.removeEventListener('abort', abort);};
          const abort = () => {cleanup(); image.removeAttribute('src'); reject(Error('Décodage annulé.'));};
          image.onload = () => {cleanup(); resolve();}; image.onerror = () => {cleanup(); reject(Error('PNG illisible.'));};
          controller.signal.addEventListener('abort', abort, {once: true}); image.src = value.url;
        });
        if (!this.active || generation !== this.generation || image.naturalWidth !== record.width || image.naturalHeight !== record.height) {
          image.removeAttribute('src'); throw Error('Dimensions PNG divergentes.');
        }
        value.image = image; value.used = ++this.clock; this.trim(key); value.resolve(value);
      })().catch(error => {if (this.cache.get(key) === value) this.cache.delete(key); this.dispose(value); value.reject(error);})
        .finally(() => {this.controllers.delete(controller); this.loading--; this.pump();});
    }
  }
  async draw(context, frame) {
    const source = frame.atlas || frame, value = await this.load(source);
    const rect = frame.rect || {x: 0, y: 0, width: frame.width, height: frame.height};
    context.clearRect(0, 0, 384, 384); context.drawImage(value.image, rect.x, rect.y, rect.width, rect.height, 0, 0, 384, 384);
  }
  clear() {
    this.active = false; this.generation++;
    for (const controller of this.controllers) controller.abort();
    for (const value of this.queue.splice(0)) value.reject(Error('Lecture annulée.'));
    for (const value of this.cache.values()) this.dispose(value); this.cache.clear();
  }
  resume() {this.active = true;}
}
