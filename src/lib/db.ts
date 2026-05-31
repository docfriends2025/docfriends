// ~/lib/db.ts — Turso (libSQL) for the Cloudflare Pages / Workers runtime.
// Secrets live on `Astro.locals.runtime.env` at request time (process.env is
// EMPTY in workerd). We fall back to process.env for build-time prerender.

import { createClient, type Client } from '@libsql/client/web';

export type Env = {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  SITE_URL?: string;
};

type LocalsLike = { runtime?: { env?: Record<string, string | undefined> } };

/** Resolve env from the CF runtime, then process.env (build time / node dev). */
export function getEnv(locals: App.Locals): Env {
  const runtimeEnv = (locals as unknown as LocalsLike)?.runtime?.env ?? {};
  const pe = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>;
  return {
    TURSO_DATABASE_URL: runtimeEnv.TURSO_DATABASE_URL ?? pe.TURSO_DATABASE_URL ?? '',
    TURSO_AUTH_TOKEN:   runtimeEnv.TURSO_AUTH_TOKEN ?? pe.TURSO_AUTH_TOKEN ?? '',
    RESEND_API_KEY:     runtimeEnv.RESEND_API_KEY ?? pe.RESEND_API_KEY,
    EMAIL_FROM:         runtimeEnv.EMAIL_FROM ?? pe.EMAIL_FROM,
    SITE_URL:           runtimeEnv.SITE_URL ?? pe.SITE_URL,
  };
}

/** Cheap guard: are Turso credentials present? */
export function hasDb(env: Env): boolean {
  return !!(env.TURSO_DATABASE_URL && env.TURSO_AUTH_TOKEN);
}

/** Fresh client per request — no cross-isolate cache on the edge. */
export function getDb(env: Env): Client {
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) {
    throw new Error(
      'Missing Turso credentials. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in ' +
      '.dev.vars (local) or the Cloudflare Pages dashboard (Production + Preview).'
    );
  }
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

// ─── id + time helpers ───────────────────────────────────────────────
export function ulid(): string {
  const A = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let t = Date.now();
  let ts = '';
  for (let i = 9; i >= 0; i--) { ts = A[t % 32] + ts; t = Math.floor(t / 32); }
  const r = new Uint8Array(16);
  crypto.getRandomValues(r);
  let rs = '';
  for (let i = 0; i < 16; i++) rs += A[r[i] % 32];
  return ts + rs;
}

export function now(): number {
  return Date.now();
}
