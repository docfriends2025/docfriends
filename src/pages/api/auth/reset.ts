// POST /api/auth/reset  { token, password }
// Validates a single-use 'reset' token, sets/replaces the password (works for
// link-only accounts too), invalidates all existing sessions, then logs in fresh.
import type { APIRoute } from 'astro';
import { getEnv, hasDb } from '~/lib/db';
import { consumeMagicLink, getUserByEmail, setUserPassword, markEmailVerified, destroyUserSessions, createSession, setSessionCookie } from '~/lib/auth';
import { hashPassword, passwordTooShort, MIN_PASSWORD_LEN } from '~/lib/password';
import { HOME_FOR_ROLE } from '~/lib/site';

export const prerender = false;
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request, url, cookies, clientAddress, locals }) => {
  const env = getEnv(locals);
  if (!hasDb(env)) return json({ ok: false, error: 'Not configured.' }, 500);

  let body: { token?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }
  const token = typeof body.token === 'string' ? body.token : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (passwordTooShort(password)) return json({ ok: false, error: `Password must be at least ${MIN_PASSWORD_LEN} characters.` }, 400);

  const result = await consumeMagicLink(env, token, ['reset']);
  if (!result.ok) return json({ ok: false, error: result.reason }, 400);

  const user = await getUserByEmail(env, result.email);
  if (!user) return json({ ok: false, error: 'Could not reset that account.' }, 400);

  try {
    const hash = await hashPassword(password);
    await setUserPassword(env, user.id, hash);
    await markEmailVerified(env, user.id);           // completing a reset proves ownership
    await destroyUserSessions(env, user.id);          // kill every existing session
  } catch (e) {
    console.error('reset failed', e instanceof Error ? e.message : 'err');
    return json({ ok: false, error: 'Could not reset your password. Try again.' }, 500);
  }

  const session = await createSession(env, user.id, { clientIp: clientAddress, userAgent: request.headers.get('user-agent') });
  setSessionCookie(cookies, session.id, { secure: url.protocol === 'https:' });
  return json({ ok: true, redirect: HOME_FOR_ROLE[user.role] ?? '/dashboard' });
};
