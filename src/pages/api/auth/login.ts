// POST /api/auth/login  { email, password, next? }
// Generic errors (no email/password distinction). Unverified accounts are blocked
// with a resend hint. Per email+IP rate limit via KV. Success → session + redirect.
import type { APIRoute } from 'astro';
import { getEnv, hasDb } from '~/lib/db';
import { getUserByEmail, createSession, setSessionCookie } from '~/lib/auth';
import { verifyPassword } from '~/lib/password';
import { HOME_FOR_ROLE } from '~/lib/site';
import { isRateLimited, bumpFailure, clearFailures } from '~/lib/ratelimit';

export const prerender = false;
const MAX_FAILS = 5;
const WINDOW_SEC = 15 * 60;
const json = (b: object, s = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...headers } });
const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);
const safeNext = (raw: string | null) => (raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null);

export const POST: APIRoute = async ({ request, url, cookies, clientAddress, locals }) => {
  const env = getEnv(locals);
  if (!hasDb(env)) return json({ ok: false, error: 'Sign-in is not configured yet.' }, 500);

  let body: { email?: unknown; password?: unknown; next?: unknown };
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }

  const email = (str(body.email, 254) ?? '').toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const next = safeNext(str(body.next, 200));
  const ip = clientAddress || 'unknown';
  const rlKey = `login:${email}:${ip}`;

  if (email && await isRateLimited(locals, rlKey, MAX_FAILS)) {
    return json({ ok: false, error: 'Too many attempts. Please wait a few minutes and try again.' }, 429, { 'Retry-After': String(WINDOW_SEC) });
  }

  const GENERIC = 'Invalid email or password.';
  if (!email || !password) { await bumpFailure(locals, rlKey, WINDOW_SEC); return json({ ok: false, error: GENERIC }, 401); }

  const user = await getUserByEmail(env, email);
  const valid = !!user && !!user.passwordHash && await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await bumpFailure(locals, rlKey, WINDOW_SEC);
    return json({ ok: false, error: GENERIC }, 401);
  }

  // Correct password but unverified → block (not a failed attempt; offer resend).
  if (user!.emailVerifiedAt == null) {
    return json({ ok: false, error: 'Please verify your email before signing in. We can email you a sign-in link.', unverified: true, email }, 403);
  }

  await clearFailures(locals, rlKey);
  const session = await createSession(env, user!.id, { clientIp: clientAddress, userAgent: request.headers.get('user-agent') });
  setSessionCookie(cookies, session.id, { secure: url.protocol === 'https:' });
  return json({ ok: true, redirect: next ?? HOME_FOR_ROLE[user!.role] ?? '/dashboard' });
};
