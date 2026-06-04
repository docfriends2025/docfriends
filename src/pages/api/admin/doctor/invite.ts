// POST /api/admin/doctor/invite  { email, name?, specialty? }
// Admin only (enforced in-handler). The inverse of self-apply: an admin invites a known
// doctor by email. Creates (or attaches) a doctors row in the 'invited' state and emails a
// single-use completion link. Never resets an existing account's password/role.
//
// Dedup rules:
//   • a doctors row already exists for the email → no duplicate; return its status + id.
//       - if that row is still 'invited', re-mint + re-send the invite (resent:true).
//   • a non-doctor user exists for the email → attach a NEW doctors row to that user,
//       leaving their account/password untouched, and send the invite.
//   • otherwise → create a passwordless users row (role 'doctor', unverified) + doctors row.
import type { APIRoute } from 'astro';
import { getEnv, hasDb, getDb, ulid, now } from '~/lib/db';
import { getUserByEmail, createMagicLink } from '~/lib/auth';
import { initialsFrom } from '~/lib/format';
import { sendEmail, doctorInviteEmail } from '~/lib/email';

export const prerender = false;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);
const validEmail = (e: string) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export const POST: APIRoute = async ({ request, clientAddress, locals }) => {
  const env = getEnv(locals);
  if (locals.user?.role !== 'admin') return json({ ok: false, error: 'Forbidden.' }, 403);
  if (!hasDb(env)) return json({ ok: false, error: 'Not configured.' }, 500);

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }

  const email = (str(b.email, 254) ?? '').toLowerCase();
  const nameIn = str(b.name, 120);
  let specialty = str(b.specialty, 40);
  if (!email || !validEmail(email)) return json({ ok: false, error: 'Please enter a valid email.' }, 400);

  const db = getDb(env);
  const adminId = locals.user.id;
  const ts = now();
  const origin = env.SITE_URL || new URL(request.url).origin;
  const ua = request.headers.get('user-agent');

  // Optional specialty pre-fill must be a real, active specialty — otherwise ignore it.
  if (specialty) {
    const sp = await db.execute({ sql: 'SELECT 1 FROM specialties WHERE slug = ? AND active = 1', args: [specialty] });
    if (!sp.rows.length) specialty = null;
  }

  const sendInvite = async (): Promise<string> => {
    let provider = 'resend';
    try {
      const magic = await createMagicLink(env, email, { purpose: 'doctor_invite', nextUrl: '/doctor', ttlMs: INVITE_TTL_MS, clientIp: clientAddress, userAgent: ua });
      if (magic) {
        const link = `${origin}/for-physicians/complete?token=${encodeURIComponent(magic.token)}`;
        const r = await sendEmail(env, doctorInviteEmail({ email, name: nameIn, link }));
        provider = r.provider;
      }
    } catch (e) { console.error('invite email failed', e instanceof Error ? e.message : 'err'); }
    return provider;
  };

  // 1) Existing doctors row for this email?
  const existingDoc = await db.execute({
    sql: `SELECT d.id, d.application_status FROM doctors d JOIN users u ON u.id = d.user_id
          WHERE u.email = ? ORDER BY d.applied_at DESC, d.created_at DESC LIMIT 1`,
    args: [email],
  });
  if (existingDoc.rows.length) {
    const doctorId = String(existingDoc.rows[0].id);
    const status = existingDoc.rows[0].application_status ? String(existingDoc.rows[0].application_status) : 'pending';
    if (status === 'invited') {
      // Re-send the invite for a still-pending completion.
      await db.execute({ sql: 'UPDATE doctors SET invited_by = ?, invited_at = ? WHERE id = ?', args: [adminId, ts, doctorId] });
      const provider = await sendInvite();
      return json({ ok: true, status: 'invited', doctorId, resent: true, provider });
    }
    // Already an applicant / active / rejected doctor — no duplicate.
    return json({ ok: true, status, doctorId, duplicate: true });
  }

  // 2) A non-doctor user already exists → attach a doctors row WITHOUT touching their account.
  const existingUser = await getUserByEmail(env, email);
  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
  } else {
    // 3) No user yet → create a passwordless 'doctor' user (unverified, no password).
    userId = ulid();
    try {
      await db.execute({
        sql: `INSERT INTO users (id, email, name, phone, role, email_verified_at, password_hash, created_at, last_seen_at)
              VALUES (?, ?, ?, NULL, 'doctor', NULL, NULL, ?, ?)`,
        args: [userId, email, nameIn, ts, ts],
      });
    } catch (e) {
      console.error('invite user insert failed', e instanceof Error ? e.message : 'err');
      return json({ ok: false, error: 'Could not create the invite. Try again.' }, 500);
    }
  }

  const displayName = nameIn ?? (existingUser?.name ?? email.split('@')[0]);
  const doctorId = ulid();
  try {
    await db.execute({
      sql: `INSERT INTO doctors (id, user_id, name, initials, specialty_slug, rating, review_count,
                                 verified, active, application_status, invited_by, invited_at, created_at)
            VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 'invited', ?, ?, ?)`,
      args: [doctorId, userId, displayName, initialsFrom(displayName), specialty, adminId, ts, ts],
    });
  } catch (e) {
    console.error('invite doctor insert failed', e instanceof Error ? e.message : 'err');
    return json({ ok: false, error: 'Could not create the invite. Try again.' }, 500);
  }

  const provider = await sendInvite();
  return json({ ok: true, status: 'invited', doctorId, created: !existingUser, attached: !!existingUser, provider });
};
