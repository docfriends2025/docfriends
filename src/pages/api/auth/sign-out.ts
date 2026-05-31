// GET|POST /api/auth/sign-out → destroy session, clear cookie, home.
import type { APIRoute } from 'astro';
import { getEnv, hasDb } from '~/lib/db';
import { readSessionCookie, destroySession, clearSessionCookie } from '~/lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, locals }) => {
  const env = getEnv(locals);
  const sid = readSessionCookie(cookies);
  if (sid && hasDb(env)) { try { await destroySession(env, sid); } catch (e) { console.error(e); } }
  clearSessionCookie(cookies);
  return new Response(null, { status: 302, headers: { Location: '/' } });
};
export const GET = POST;
