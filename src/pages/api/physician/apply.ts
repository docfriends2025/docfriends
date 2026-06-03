// POST /api/physician/apply — a physician applies to join. Account fields reuse the
// Phase 1 password/verify path; profile + admin-only credentials create a PENDING doctors
// row (verified=0, active=0). Anti-enumeration: existing email → generic "sign in first"
// note, NO mutation of the existing account.
import type { APIRoute } from 'astro';
import { getEnv, hasDb, getDb, ulid, now } from '~/lib/db';
import { getUserByEmail, createPasswordUser, createMagicLink } from '~/lib/auth';
import { hashPassword, passwordTooShort, MIN_PASSWORD_LEN } from '~/lib/password';
import { initialsFrom } from '~/lib/format';
import { sendEmail, verifyEmail, existingAccountEmail } from '~/lib/email';

export const prerender = false;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);
const validEmail = (e: string) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export const POST: APIRoute = async ({ request, clientAddress, locals }) => {
  const env = getEnv(locals);
  if (!hasDb(env)) return json({ ok: false, error: 'Applications are not configured yet.' }, 500);

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }

  const name = str(b.name, 120);
  const email = (str(b.email, 254) ?? '').toLowerCase();
  const password = typeof b.password === 'string' ? b.password : '';
  const specialty = str(b.specialty, 40);
  const subspecialty = str(b.subspecialty, 80);
  const hospital = str(b.hospital, 120);
  const location = str(b.location, 120);
  const yearsRaw = Number(b.years);
  const years = Number.isFinite(yearsRaw) && yearsRaw >= 0 && yearsRaw <= 80 ? Math.floor(yearsRaw) : null;
  const bio = str(b.bio, 1000);
  const licenseNumber = str(b.license_number, 80);
  const licenseAuthority = str(b.license_authority, 120);
  const registryId = str(b.registry_id, 80);
  const credentialNote = str(b.credential_note, 1000);

  if (!name) return json({ ok: false, error: 'Please enter your name.' }, 400);
  if (!email || !validEmail(email)) return json({ ok: false, error: 'Please enter a valid email.' }, 400);
  if (passwordTooShort(password)) return json({ ok: false, error: `Password must be at least ${MIN_PASSWORD_LEN} characters.` }, 400);
  if (!specialty) return json({ ok: false, error: 'Please choose your specialty.' }, 400);
  if (!licenseNumber || !licenseAuthority) return json({ ok: false, error: 'License number and issuing authority are required.' }, 400);

  const db = getDb(env);
  const sp = await db.execute({ sql: 'SELECT 1 FROM specialties WHERE slug = ? AND active = 1', args: [specialty] });
  if (!sp.rows.length) return json({ ok: false, error: 'That specialty is not available.' }, 400);

  const origin = env.SITE_URL || new URL(request.url).origin;
  const ua = request.headers.get('user-agent');
  const generic = (provider: string, devLink?: string) => json({ ok: true, sent: true, provider, devLink });

  // Existing account → do NOT mutate it (protects real users + anti-enumeration). Ask them to sign in.
  const existing = await getUserByEmail(env, email);
  if (existing) {
    try { await sendEmail(env, existingAccountEmail({ email, signInLink: `${origin}/sign-in`, resetLink: `${origin}/forgot-password` })); } catch { /* noop */ }
    return generic('resend');
  }

  let passwordHash: string;
  try { passwordHash = await hashPassword(password); } catch (e) { console.error('apply hash failed', e instanceof Error ? e.message : 'err'); return json({ ok: false, error: 'Could not submit your application. Try again.' }, 500); }

  const user = await createPasswordUser(env, { email, name, passwordHash, role: 'doctor' });
  if (!user) { // race
    try { await sendEmail(env, existingAccountEmail({ email, signInLink: `${origin}/sign-in`, resetLink: `${origin}/forgot-password` })); } catch { /* noop */ }
    return generic('resend');
  }

  const ts = now();
  try {
    await db.execute({
      sql: `INSERT INTO doctors (id, user_id, name, initials, specialty_slug, subspecialty, hospital, location, years_practice,
                                 rating, review_count, verified, active, bio,
                                 license_number, license_authority, registry_id, credential_note,
                                 application_status, applied_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      args: [ulid(), user.id, name, initialsFrom(name), specialty, subspecialty, hospital, location, years, bio,
             licenseNumber, licenseAuthority, registryId, credentialNote, ts, ts],
    });
  } catch (e) {
    console.error('apply insert failed', e instanceof Error ? e.message : 'err');
    return json({ ok: false, error: 'Could not submit your application. Try again.' }, 500);
  }

  let provider = 'resend', devLink: string | undefined;
  try {
    const magic = await createMagicLink(env, email, { purpose: 'verify', nextUrl: '/doctor', ttlMs: VERIFY_TTL_MS, clientIp: clientAddress, userAgent: ua });
    if (magic) {
      const link = `${origin}/api/auth/verify?token=${encodeURIComponent(magic.token)}`;
      const r = await sendEmail(env, verifyEmail({ email, link }));
      provider = r.provider;
      if (r.provider === 'console') devLink = link;
    }
  } catch (e) { console.error('apply verify email failed', e instanceof Error ? e.message : 'err'); }

  return generic(provider, devLink);
};
