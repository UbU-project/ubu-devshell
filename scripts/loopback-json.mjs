// Shared transport only. Callers own diagnostics; this module never logs data.
export class TransportError extends Error {
  constructor(code, status = null) { super(code); this.code = code; this.status = status; }
}
export function loopbackUrl(base, path, allowedPorts) {
  let root, url;
  try { root = new URL(base); url = new URL(path, root); } catch { throw new TransportError('invalid_url'); }
  if (root.protocol !== 'http:' || root.hostname !== '127.0.0.1' || root.username || root.password ||
      url.username || url.password || url.origin !== root.origin || !allowedPorts.has(Number(root.port))) throw new TransportError('unowned_loopback');
  return url;
}
export async function requestJson(base, method, path, body, {
  allowedPorts, fetchImpl = globalThis.fetch, timeoutMs = 650000, plain = false
} = {}) {
  const url = loopbackUrl(base, path, allowedPorts);
  const init = { method, redirect:'error', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) };
  if (body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
  let response, text;
  try {
    response = await fetchImpl(url.href, init);
    const chunks = []; let size = 0;
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      try { for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.length;
        if (size > 16 * 1024 * 1024) throw new TransportError('response_too_large', response.status);
        chunks.push(next.value); } } finally { await reader.cancel().catch(() => {}); }
      text = Buffer.concat(chunks).toString('utf8');
    } else { text = await response.text(); if (Buffer.byteLength(text) > 16*1024*1024) throw new TransportError('response_too_large', response.status); }
  } catch (error) { if (error instanceof TransportError) throw error; throw new TransportError('connection_or_timeout'); }
  let data;
  try { data = plain ? text : text ? JSON.parse(text) : null; } catch { throw new TransportError('invalid_json', response.status); }
  return { status: response.status, data, text };
}
