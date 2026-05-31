// POST /api/auth/request  { email, next? } → sends magic link (or returns devLink).
import type { APIRoute } from 'astro';
import { getEnv, hasDb } from '~/lib/db';
import { createMagicLink } from '~/lib/auth';
import { sendEmail, magicLinkEmail } from '~/lib/email';

export const prerender = false;

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const safeNext = (raw: string | null) => (raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null);
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request, clientAddress, url, locals }) => {
  const env = getEnv(locals);
  let body: { email?: unknown; next?: unknown };
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }

  const email = str(body.email, 254);
  const next = safeNext(str(body.next, 200));
  if (!email) return json({ ok: false, error: 'Please enter your email.' }, 400);
  if (!hasDb(env)) return json({ ok: false, error: 'Auth is not configured yet. Add Turso credentials.' }, 500);

  let magic;
  try {
    magic = await createMagicLink(env, email, { nextUrl: next ?? undefined, clientIp: clientAddress, userAgent: request.headers.get('user-agent') });
  } catch (err) {
    console.error('createMagicLink failed', err);
    return json({ ok: false, error: 'Could not create a sign-in link. Try again.' }, 500);
  }
  if (!magic) return json({ ok: false, error: 'That email does not look right.' }, 400);

  const origin = env.SITE_URL || `${url.protocol}//${url.host}`;
  const link = `${origin}/api/auth/verify?token=${encodeURIComponent(magic.token)}`;

  let result;
  try { result = await sendEmail(env, magicLinkEmail({ email: magic.email, link })); }
  catch { result = { ok: false, provider: 'resend' as const }; }

  const isDev = result.provider === 'console';
  return json({ ok: true, email: magic.email, sent: result.ok, provider: result.provider, devLink: isDev ? link : undefined });
};
