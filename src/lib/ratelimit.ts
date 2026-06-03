// ~/lib/ratelimit.ts — best-effort fixed-window rate limiting via the SESSION KV binding.
// Degrades open (no limiting) if KV is unavailable, e.g. local dev without the binding.

interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}
type LocalsLike = { runtime?: { env?: { SESSION?: KV } } };

function kv(locals: App.Locals): KV | null {
  return (locals as unknown as LocalsLike)?.runtime?.env?.SESSION ?? null;
}

/** True if `key` is already at/over `max` failures within the window. */
export async function isRateLimited(locals: App.Locals, key: string, max: number): Promise<boolean> {
  const ns = kv(locals);
  if (!ns) return false;
  try {
    const raw = await ns.get(`rl:${key}`);
    return (raw ? parseInt(raw, 10) || 0 : 0) >= max;
  } catch { return false; }
}

/** Record one failure; the key auto-expires after `windowSec`. */
export async function bumpFailure(locals: App.Locals, key: string, windowSec: number): Promise<void> {
  const ns = kv(locals);
  if (!ns) return;
  try {
    const raw = await ns.get(`rl:${key}`);
    const n = raw ? parseInt(raw, 10) || 0 : 0;
    await ns.put(`rl:${key}`, String(n + 1), { expirationTtl: windowSec });
  } catch { /* best-effort */ }
}

/** Clear the counter on success. */
export async function clearFailures(locals: App.Locals, key: string): Promise<void> {
  const ns = kv(locals);
  if (!ns) return;
  try { await ns.delete(`rl:${key}`); } catch { /* best-effort */ }
}
