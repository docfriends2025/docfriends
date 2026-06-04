// POST /api/physician/complete  { token, name, password, specialty, license_number, license_authority, … }
// An invited doctor completes their profile. Validates the single-use 'doctor_invite' token,
// sets the password + marks the email verified, fills in the doctors row, then activates per
// the AUTO_APPROVE_INVITE flag, and logs the doctor in.
import type { APIRoute } from 'astro';
import { getEnv, hasDb, getDb, now } from '~/lib/db';
import { consumeMagicLink, getUserByEmail, setUserPassword, markEmailVerified, createSession, setSessionCookie } from '~/lib/auth';
import { hashPassword, passwordTooShort, MIN_PASSWORD_LEN } from '~/lib/password';
import { initialsFrom } from '~/lib/format';
import { HOME_FOR_ROLE } from '~/lib/site';

export const prerender = false;

// ┌──────────────────────────────────────────────────────────────────────────┐
// │  AUTO_APPROVE_INVITE — the one switch for invite completion behaviour.      │
// │    true  (default) → completing the invite AUTO-APPROVES + activates the    │
// │                       doctor immediately (active=1, verified=1, approved).  │
// │    false           → completing lands the doctor as 'pending' in the admin  │
// │                       review queue for a final Approve (active=0).          │
// └──────────────────────────────────────────────────────────────────────────┘
const AUTO_APPROVE_INVITE = true;

const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);

export const POST: APIRoute = async ({ request, url, cookies, clientAddress, locals }) => {
  const env = getEnv(locals);
  if (!hasDb(env)) return json({ ok: false, error: 'Not configured.' }, 500);

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }

  const token = typeof b.token === 'string' ? b.token : '';
  const password = typeof b.password === 'string' ? b.password : '';
  const name = str(b.name, 120);
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
  if (passwordTooShort(password)) return json({ ok: false, error: `Password must be at least ${MIN_PASSWORD_LEN} characters.` }, 400);
  if (!specialty) return json({ ok: false, error: 'Please choose your specialty.' }, 400);
  if (!licenseNumber || !licenseAuthority) return json({ ok: false, error: 'License number and issuing authority are required.' }, 400);

  const db = getDb(env);
  const sp = await db.execute({ sql: 'SELECT 1 FROM specialties WHERE slug = ? AND active = 1', args: [specialty] });
  if (!sp.rows.length) return json({ ok: false, error: 'That specialty is not available.' }, 400);

  // Validate + consume the invite token.
  const result = await consumeMagicLink(env, token, ['doctor_invite']);
  if (!result.ok) return json({ ok: false, error: result.reason }, 400);

  const user = await getUserByEmail(env, result.email);
  if (!user) return json({ ok: false, error: 'This invite is no longer valid.' }, 400);

  // The invited doctors row for this user (created at invite time).
  const dr = await db.execute({
    sql: 'SELECT id FROM doctors WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [user.id],
  });
  const doctorId = dr.rows[0] ? String(dr.rows[0].id) : null;
  if (!doctorId) return json({ ok: false, error: 'This invite is no longer valid.' }, 400);

  const ts = now();
  try {
    const hash = await hashPassword(password);
    await setUserPassword(env, user.id, hash);
    await markEmailVerified(env, user.id);                       // completing the invite proves ownership
    await db.execute({ sql: "UPDATE users SET role = 'doctor', name = COALESCE(?, name) WHERE id = ?", args: [name, user.id] });

    // AUTO_APPROVE_INVITE → active+approved now; otherwise land in the 'pending' review queue.
    // Provenance for an invited doctor lives in invited_by/at — no human review row is written.
    const approved = AUTO_APPROVE_INVITE;
    const status = approved ? 'approved' : 'pending';
    await db.execute({
      sql: `UPDATE doctors SET name = ?, initials = ?, specialty_slug = ?, subspecialty = ?, hospital = ?,
                               location = ?, years_practice = ?, bio = ?, license_number = ?, license_authority = ?,
                               registry_id = ?, credential_note = ?, application_status = ?,
                               verified = ?, active = ?, applied_at = COALESCE(applied_at, ?)
            WHERE id = ?`,
      args: [name, initialsFrom(name), specialty, subspecialty, hospital, location, years, bio,
             licenseNumber, licenseAuthority, registryId, credentialNote, status,
             approved ? 1 : 0, approved ? 1 : 0, ts, doctorId],
    });
  } catch (e) {
    console.error('complete failed', e instanceof Error ? e.message : 'err');
    return json({ ok: false, error: 'Could not complete your profile. Try again.' }, 500);
  }

  const session = await createSession(env, user.id, { clientIp: clientAddress, userAgent: request.headers.get('user-agent') });
  setSessionCookie(cookies, session.id, { secure: url.protocol === 'https:' });
  return json({ ok: true, redirect: HOME_FOR_ROLE['doctor'] ?? '/doctor' });
};
