// POST /api/auth/forgot  { email }
// Always returns a generic success (anti-enumeration). If the email exists, emails a
// single-use, short-lived reset link.
import type { APIRoute } from 'astro';
import { getEnv, hasDb } from '~/lib/db';
import { getUserByEmail, createMagicLink } from '~/lib/auth';
import { sendEmail, resetEmail } from '~/lib/email';

export const prerender = false;
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);

export const POST: APIRoute = async ({ request, clientAddress, locals }) => {
  const env = getEnv(locals);
  if (!hasDb(env)) return json({ ok: false, error: 'Not configured.' }, 500);

  let body: { email?: unknown };
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }
  const email = (str(body.email, 254) ?? '').toLowerCase();

  const generic = json({ ok: true });
  if (!email) return generic;

  try {
    const user = await getUserByEmail(env, email);
    if (user) {
      const origin = env.SITE_URL || new URL(request.url).origin;
      const magic = await createMagicLink(env, email, { purpose: 'reset', ttlMs: RESET_TTL_MS, clientIp: clientAddress, userAgent: request.headers.get('user-agent') });
      if (magic) await sendEmail(env, resetEmail({ email, link: `${origin}/reset-password?token=${encodeURIComponent(magic.token)}` }));
    }
  } catch (e) {
    console.error('forgot-password failed', e instanceof Error ? e.message : 'err');
  }
  return generic; // identical response whether or not the email exists
};
