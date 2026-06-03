// POST /api/auth/signup  { name, email, password, next? }
// Creates a password client account (email unverified) and emails a verify link.
// Anti-enumeration: an already-registered email returns the SAME generic response
// (and gets a "you already have an account" note) — never reveals registration.
import type { APIRoute } from 'astro';
import { getEnv, hasDb } from '~/lib/db';
import { getUserByEmail, createPasswordUser, createMagicLink } from '~/lib/auth';
import { hashPassword, passwordTooShort, MIN_PASSWORD_LEN } from '~/lib/password';
import { sendEmail, verifyEmail, existingAccountEmail } from '~/lib/email';

export const prerender = false;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);
const safeNext = (raw: string | null) => (raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null);
const validEmail = (e: string) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export const POST: APIRoute = async ({ request, clientAddress, locals }) => {
  const env = getEnv(locals);
  if (!hasDb(env)) return json({ ok: false, error: 'Sign-up is not configured yet.' }, 500);

  let body: { name?: unknown; email?: unknown; password?: unknown; next?: unknown };
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }

  const name = str(body.name, 120);
  const emailRaw = str(body.email, 254);
  const password = typeof body.password === 'string' ? body.password : '';
  const next = safeNext(str(body.next, 200)) ?? '/dashboard';
  const email = emailRaw ? emailRaw.toLowerCase() : null;

  if (!email || !validEmail(email)) return json({ ok: false, error: 'Please enter a valid email.' }, 400);
  if (passwordTooShort(password)) return json({ ok: false, error: `Password must be at least ${MIN_PASSWORD_LEN} characters.` }, 400);

  const origin = env.SITE_URL || new URL(request.url).origin;
  const ua = request.headers.get('user-agent');

  // Generic response used for BOTH new + existing — identical shape (no enumeration).
  const generic = (provider: string, devLink?: string) => json({ ok: true, sent: true, provider, devLink });

  const existing = await getUserByEmail(env, email);
  if (existing) {
    try {
      await sendEmail(env, existingAccountEmail({ email, signInLink: `${origin}/sign-in`, resetLink: `${origin}/forgot-password` }));
    } catch (e) { console.error('existing-account note failed', e instanceof Error ? e.message : 'err'); }
    return generic('resend');
  }

  let passwordHash: string;
  try { passwordHash = await hashPassword(password); } catch (e) { console.error('hash failed', e instanceof Error ? e.message : 'err'); return json({ ok: false, error: 'Could not create your account. Try again.' }, 500); }

  const user = await createPasswordUser(env, { email, name, passwordHash });
  if (!user) {
    // Lost a race — treat exactly like the existing-account branch.
    try { await sendEmail(env, existingAccountEmail({ email, signInLink: `${origin}/sign-in`, resetLink: `${origin}/forgot-password` })); } catch { /* noop */ }
    return generic('resend');
  }

  let provider = 'resend', devLink: string | undefined;
  try {
    const magic = await createMagicLink(env, email, { purpose: 'verify', nextUrl: next, ttlMs: VERIFY_TTL_MS, clientIp: clientAddress, userAgent: ua });
    if (magic) {
      const link = `${origin}/api/auth/verify?token=${encodeURIComponent(magic.token)}`;
      const r = await sendEmail(env, verifyEmail({ email, link }));
      provider = r.provider;
      if (r.provider === 'console') devLink = link;
    }
  } catch (e) { console.error('verify email failed', e instanceof Error ? e.message : 'err'); }

  return generic(provider, devLink);
};
