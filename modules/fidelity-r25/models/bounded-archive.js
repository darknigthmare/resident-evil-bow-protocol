import {assetURL, verifiedBytes} from '../../fidelity-r24/models/verified-assets.js';

// The larger cap applies only to an explicitly selected original archive.
export const MAX_ARCHIVE_BYTES = 80 * 1024 * 1024;
export async function verifiedArchive(record, base, allowedRoot, signal, fetcher = fetch) {
  if (!Number.isSafeInteger(record?.bytes) || record.bytes < 1 || record.bytes > MAX_ARCHIVE_BYTES
    || !/^[a-f0-9]{64}$/.test(record?.sha256)) throw Error('Description d’archive invalide.');
  if (record.bytes <= 40 * 1024 * 1024) return verifiedBytes(record, base, allowedRoot, signal, fetcher);
  const response = await fetcher(assetURL(record, base, allowedRoot), {signal});
  if (!response.ok) throw Error('Archive source indisponible.');
  const reader = response.body?.getReader();
  if (!reader) throw Error('Le téléchargement borné de cette archive est indisponible.');
  const pieces = []; let size = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength;
      if (size > record.bytes || size > MAX_ARCHIVE_BYTES) { await reader.cancel(); throw Error('Taille d’archive différente de la source.'); }
      pieces.push(part.value);
    }
  } finally { reader.releaseLock(); }
  if (size !== record.bytes) throw Error('Taille d’archive différente de la source.');
  const bytes = new Uint8Array(size); let offset = 0;
  for (const piece of pieces) { bytes.set(piece, offset); offset += piece.byteLength; }
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
  if (digest !== record.sha256) throw Error('Les octets reçus diffèrent de l’archive conservée.');
  return bytes;
}
