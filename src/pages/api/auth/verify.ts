// GET /api/auth/verify?token=... → consume link, create session, redirect by role.
import type { APIRoute } from 'astro';
import { getEnv, hasDb } from '~/lib/db';
import { consumeMagicLink, getOrCreateUser, createSession, setSessionCookie } from '~/lib/auth';
import { HOME_FOR_ROLE } from '~/lib/site';

export const prerender = false;
const go = (path: string) => new Response(null, { status: 302, headers: { Location: path } });
const safeNext = (raw: string | null) => (raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null);

export const GET: APIRoute = async ({ url, cookies, clientAddress, request, locals }) => {
  const env = getEnv(locals);
  const token = url.searchParams.get('token');
  if (!token) return go('/sign-in?error=missing-token');
  if (!hasDb(env)) return go('/sign-in?error=not-configured');

  const result = await consumeMagicLink(env, token);
  if (!result.ok) return go(`/sign-in?error=${encodeURIComponent(result.reason)}`);

  let role = 'client';
  try {
    const user = await getOrCreateUser(env, result.email);
    role = user.role;
    const session = await createSession(env, user.id, { clientIp: clientAddress, userAgent: request.headers.get('user-agent') });
    setSessionCookie(cookies, session.id, { secure: url.protocol === 'https:' });
  } catch (err) {
    console.error('verify failed', err);
    return go('/sign-in?error=session-failed');
  }
  return go(safeNext(result.nextUrl) ?? HOME_FOR_ROLE[role] ?? '/dashboard');
};
