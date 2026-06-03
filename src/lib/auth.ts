// ~/lib/auth.ts — passwordless magic-link auth + opaque sessions.
// Every DB-touching function takes `env` (Cloudflare runtime). Tokens are random;
// only their SHA-256 is stored. Sessions are random opaque cookie values.

import type { AstroCookies } from 'astro';
import { getDb, ulid, now, type Env } from './db';

export const COOKIE_NAME = 'df_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAGIC_TTL_MS   = 15 * 60 * 1000;           // 15 minutes
const TOKEN_BYTES    = 32;

export type Role = 'client' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: Role;
  emailVerifiedAt: number | null;
  createdAt: number;
  lastSeenAt: number;
}

// ─── token helpers ───────────────────────────────────────────────────
function randomToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  if (!e || e.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: String(row.email),
    name: row.name ? String(row.name) : null,
    phone: row.phone ? String(row.phone) : null,
    role: (row.role ? String(row.role) : 'client') as Role,
    emailVerifiedAt: row.email_verified_at ? Number(row.email_verified_at) : null,
    createdAt: Number(row.created_at),
    lastSeenAt: Number(row.last_seen_at),
  };
}

// ─── magic links ─────────────────────────────────────────────────────
export type TokenPurpose = 'login' | 'verify' | 'reset';

export async function createMagicLink(
  env: Env,
  email: string,
  opts: { nextUrl?: string; clientIp?: string | null; userAgent?: string | null; purpose?: TokenPurpose; ttlMs?: number } = {}
): Promise<{ token: string; email: string } | null> {
  const cleanEmail = safeEmail(email);
  if (!cleanEmail) return null;
  const token = randomToken();
  const db = getDb(env);
  await db.execute({
    sql: `INSERT INTO auth_tokens (token_hash, email, next_url, expires_at, used_at, client_ip, user_agent, created_at, purpose)
          VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    args: [await sha256(token), cleanEmail, opts.nextUrl ?? null, now() + (opts.ttlMs ?? MAGIC_TTL_MS), opts.clientIp ?? null, opts.userAgent ?? null, now(), opts.purpose ?? 'login'],
  });
  return { token, email: cleanEmail };
}

export async function consumeMagicLink(
  env: Env,
  token: string,
  expectedPurposes: TokenPurpose[] = ['login', 'verify']
): Promise<{ ok: true; email: string; nextUrl: string | null } | { ok: false; reason: string }> {
  if (!token || token.length < 16) return { ok: false, reason: 'Invalid link.' };
  const db = getDb(env);
  const tokenHash = await sha256(token);
  const res = await db.execute({
    sql: 'SELECT email, next_url, expires_at, used_at, purpose FROM auth_tokens WHERE token_hash = ?',
    args: [tokenHash],
  });
  const row = res.rows[0];
  if (!row) return { ok: false, reason: 'This link is invalid or has been replaced.' };
  if (!expectedPurposes.includes((row.purpose ? String(row.purpose) : 'login') as TokenPurpose)) return { ok: false, reason: 'This link is not valid for this action.' };
  if (row.used_at != null) return { ok: false, reason: 'This link has already been used.' };
  if (Number(row.expires_at) < now()) return { ok: false, reason: 'This link has expired. Request a new one.' };
  await db.execute({ sql: 'UPDATE auth_tokens SET used_at = ? WHERE token_hash = ?', args: [now(), tokenHash] });
  return { ok: true, email: String(row.email), nextUrl: row.next_url ? String(row.next_url) : null };
}

// ─── users ───────────────────────────────────────────────────────────
export async function getOrCreateUser(env: Env, email: string): Promise<User> {
  const db = getDb(env);
  const existing = await db.execute({
    sql: 'SELECT id, email, name, phone, role, email_verified_at, created_at, last_seen_at FROM users WHERE email = ?',
    args: [email],
  });
  if (existing.rows[0]) {
    const ts = now();
    await db.execute({
      sql: 'UPDATE users SET last_seen_at = ?, email_verified_at = COALESCE(email_verified_at, ?) WHERE email = ?',
      args: [ts, ts, email],
    });
    return rowToUser({ ...existing.rows[0], last_seen_at: ts });
  }
  const id = ulid();
  const ts = now();
  await db.execute({
    sql: `INSERT INTO users (id, email, name, phone, role, email_verified_at, created_at, last_seen_at)
          VALUES (?, ?, NULL, NULL, 'client', ?, ?, ?)`,
    args: [id, email, ts, ts, ts],
  });
  return { id, email, name: null, phone: null, role: 'client', emailVerifiedAt: ts, createdAt: ts, lastSeenAt: ts };
}

export interface UserWithHash extends User { passwordHash: string | null; }

/** Look up a user by email WITHOUT creating one. Includes the password hash. */
export async function getUserByEmail(env: Env, email: string): Promise<UserWithHash | null> {
  const e = safeEmail(email);
  if (!e) return null;
  const r = await getDb(env).execute({
    sql: 'SELECT id, email, name, phone, role, email_verified_at, created_at, last_seen_at, password_hash FROM users WHERE email = ?',
    args: [e],
  });
  const row = r.rows[0];
  if (!row) return null;
  return { ...rowToUser(row as Record<string, unknown>), passwordHash: row.password_hash ? String(row.password_hash) : null };
}

/** Create a client account with a password (email unverified). Returns null if the email exists. */
export async function createPasswordUser(env: Env, opts: { email: string; name: string | null; passwordHash: string }): Promise<User | null> {
  const e = safeEmail(opts.email);
  if (!e) return null;
  const id = ulid();
  const ts = now();
  try {
    await getDb(env).execute({
      sql: `INSERT INTO users (id, email, name, phone, role, email_verified_at, password_hash, created_at, last_seen_at)
            VALUES (?, ?, ?, NULL, 'client', NULL, ?, ?, ?)`,
      args: [id, e, opts.name ?? null, opts.passwordHash, ts, ts],
    });
  } catch {
    return null; // UNIQUE(email) → already registered
  }
  return { id, email: e, name: opts.name ?? null, phone: null, role: 'client', emailVerifiedAt: null, createdAt: ts, lastSeenAt: ts };
}

export async function setUserPassword(env: Env, userId: string, passwordHash: string): Promise<void> {
  await getDb(env).execute({ sql: 'UPDATE users SET password_hash = ? WHERE id = ?', args: [passwordHash, userId] });
}

export async function markEmailVerified(env: Env, userId: string): Promise<void> {
  await getDb(env).execute({ sql: 'UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?', args: [now(), userId] });
}

/** Kill every session for a user (used after a password reset). */
export async function destroyUserSessions(env: Env, userId: string): Promise<void> {
  await getDb(env).execute({ sql: 'DELETE FROM sessions WHERE user_id = ?', args: [userId] });
}

// ─── sessions ────────────────────────────────────────────────────────
export async function createSession(
  env: Env,
  userId: string,
  opts: { clientIp?: string | null; userAgent?: string | null } = {}
): Promise<{ id: string }> {
  const id = randomToken();
  const ts = now();
  await getDb(env).execute({
    sql: `INSERT INTO sessions (id, user_id, expires_at, user_agent, ip, created_at, last_seen_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, userId, ts + SESSION_TTL_MS, opts.userAgent ?? null, opts.clientIp ?? null, ts, ts],
  });
  return { id };
}

export async function getSessionUser(env: Env, sessionId: string): Promise<User | null> {
  if (!sessionId) return null;
  const db = getDb(env);
  const res = await db.execute({
    sql: `SELECT u.id, u.email, u.name, u.phone, u.role, u.email_verified_at, u.created_at, u.last_seen_at, s.expires_at
          FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
    args: [sessionId],
  });
  const row = res.rows[0];
  if (!row) return null;
  if (Number(row.expires_at) < now()) {
    db.execute({ sql: 'DELETE FROM sessions WHERE id = ?', args: [sessionId] }).catch(() => {});
    return null;
  }
  db.execute({ sql: 'UPDATE sessions SET last_seen_at = ? WHERE id = ?', args: [now(), sessionId] }).catch(() => {});
  return rowToUser(row);
}

export async function destroySession(env: Env, sessionId: string): Promise<void> {
  if (!sessionId) return;
  await getDb(env).execute({ sql: 'DELETE FROM sessions WHERE id = ?', args: [sessionId] });
}

// ─── cookies ─────────────────────────────────────────────────────────
export function setSessionCookie(cookies: AstroCookies, sessionId: string, opts: { secure?: boolean } = {}): void {
  cookies.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: opts.secure ?? true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: '/' });
}

export function readSessionCookie(cookies: AstroCookies): string | null {
  const v = cookies.get(COOKIE_NAME)?.value;
  return v && v.length > 16 ? v : null;
}

export async function getCurrentUser(env: Env, cookies: AstroCookies): Promise<User | null> {
  const sid = readSessionCookie(cookies);
  if (!sid) return null;
  try {
    return await getSessionUser(env, sid);
  } catch (err) {
    console.error('getCurrentUser failed', err);
    return null;
  }
}
