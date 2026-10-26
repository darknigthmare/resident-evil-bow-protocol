import {assetURL, verifiedBytes} from '../../fidelity-r24/models/verified-assets.js';

// R26 Pincer is 85,352,847 bytes. Other resources retain the legacy 40 MiB cap.
// Allocate one declared buffer instead of retaining all chunks plus their copy.
export const MAX_ARCHIVE_BYTES = 96 * 1024 * 1024;
export async function verifiedArchive(record, base, allowedRoot, signal, fetcher = fetch) {
  if (!Number.isSafeInteger(record?.bytes) || record.bytes < 1 || record.bytes > MAX_ARCHIVE_BYTES
    || !/^[a-f0-9]{64}$/.test(record?.sha256)) throw Error('Description d’archive invalide.');
  if (record.bytes <= 40 * 1024 * 1024) return verifiedBytes(record, base, allowedRoot, signal, fetcher);
  const response = await fetcher(assetURL(record, base, allowedRoot), {signal});
  if (!response.ok) throw Error('Archive source indisponible.');
  const reader = response.body?.getReader();
  if (!reader) throw Error('Le téléchargement borné de cette archive est indisponible.');
  const bytes = new Uint8Array(record.bytes); let size = 0;
  const cancelled = async () => { try { await reader.cancel(); } catch {} };
  try {
    while (true) {
      if (signal?.aborted) { await cancelled(); throw new DOMException('Chargement interrompu.', 'AbortError'); }
      const part = await reader.read();
      if (signal?.aborted) { await cancelled(); throw new DOMException('Chargement interrompu.', 'AbortError'); }
      if (part.done) break;
      if (!(part.value instanceof Uint8Array) || size + part.value.byteLength > record.bytes) {
        await cancelled(); throw Error('Taille d’archive différente de la source.');
      }
      bytes.set(part.value, size); size += part.value.byteLength;
    }
  } finally { reader.releaseLock(); }
  if (size !== record.bytes) throw Error('Taille d’archive différente de la source.');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
  if (signal?.aborted) throw new DOMException('Chargement interrompu.', 'AbortError');
  if (digest !== record.sha256) throw Error('Les octets reçus diffèrent de l’archive conservée.');
  return bytes;
}
