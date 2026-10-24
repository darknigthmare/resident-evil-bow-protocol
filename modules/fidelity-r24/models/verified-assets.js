/* Preserve published bytes and keep source resources within this delivery. */
export function assetURL(record, base, allowedRoot) {
  const value = record?.path;
  if (typeof value !== 'string' || !value || value.includes('\\') || value.startsWith('/')
    || /^[a-z][a-z\d+.-]*:/i.test(value) || value.split('/').some(part => !part || part === '.' || part === '..')) {
    throw Error('Chemin de ressource refusé.');
  }
  const url = new URL(value.split('/').map(encodeURIComponent).join('/'), base);
  if (url.origin !== allowedRoot.origin || !url.pathname.startsWith(allowedRoot.pathname)) throw Error('Ressource hors du lot vérifié.');
  return url;
}

export async function verifiedBytes(record, base, allowedRoot, signal, fetcher = fetch) {
  if (!Number.isSafeInteger(record?.bytes) || record.bytes < 1 || record.bytes > 40 * 1024 * 1024
    || !/^[a-f0-9]{64}$/.test(record?.sha256)) throw Error('Description de ressource invalide.');
  const response = await fetcher(assetURL(record, base, allowedRoot), {signal});
  if (!response.ok) throw Error('Ressource source indisponible.');
  const reader = response.body?.getReader();
  let bytes;
  if (reader) {
    const pieces = []; let size = 0;
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        size += part.value.byteLength;
        if (size > record.bytes) { await reader.cancel(); throw Error('Taille de ressource différente de la source.'); }
        pieces.push(part.value);
      }
      bytes = new Uint8Array(size); let offset = 0;
      for (const piece of pieces) { bytes.set(piece, offset); offset += piece.byteLength; }
    } finally { reader.releaseLock(); }
  } else bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength !== record.bytes) throw Error('Taille de ressource différente de la source.');
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
  if (hash !== record.sha256) throw Error('Les octets reçus diffèrent de la source conservée.');
  return bytes;
}
