// POST /api/consult/request  { caseId, doctorId, contactPhone, preferredTimes?, note? }
// The case OWNER requests a manual follow-up consult with a doctor who offered one.
// No telephony — just captures the request + contact details for the admin queue.
import type { APIRoute } from 'astro';
import { getEnv, hasDb, getDb, ulid, now } from '~/lib/db';

export const prerender = false;
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  const user = locals.user;
  if (!user) return json({ ok: false, error: 'Please sign in.' }, 401);
  if (!hasDb(env)) return json({ ok: false, error: 'Not configured.' }, 500);

  let body: { caseId?: unknown; doctorId?: unknown; contactPhone?: unknown; preferredTimes?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }
  const caseId = str(body.caseId, 40);
  const doctorId = str(body.doctorId, 40);
  const contactPhone = str(body.contactPhone, 40);
  const preferredTimes = str(body.preferredTimes, 500);
  const note = str(body.note, 1000);
  if (!caseId || !doctorId) return json({ ok: false, error: 'Missing case or doctor.' }, 400);
  if (!contactPhone) return json({ ok: false, error: 'Please add a phone number so the team can reach you.' }, 400);

  const db = getDb(env);

  // Ownership: only the case owner may book; don't reveal others' cases.
  const cr = await db.execute({ sql: 'SELECT user_id FROM cases WHERE id = ?', args: [caseId] });
  const owner = cr.rows[0]?.user_id ? String(cr.rows[0].user_id) : null;
  if (!owner || owner !== user.id) return json({ ok: false, error: 'Not found.' }, 404);

  // The doctor must have submitted an opinion on this case AND offered a consult.
  const off = await db.execute({ sql: "SELECT 1 FROM opinions WHERE case_id = ? AND doctor_id = ? AND status = 'submitted' AND available_teleconsult = 1", args: [caseId, doctorId] });
  if (!off.rows.length) return json({ ok: false, error: 'A consult isn’t available with this doctor.' }, 403);

  // One request per case+doctor — return the existing one instead of duplicating.
  const ex = await db.execute({ sql: 'SELECT status FROM teleconsults WHERE case_id = ? AND doctor_id = ?', args: [caseId, doctorId] });
  if (ex.rows[0]) return json({ ok: true, existing: true, status: String(ex.rows[0].status) });

  const ts = now();
  await db.execute({
    sql: `INSERT INTO teleconsults (id, case_id, doctor_id, user_id, status, contact_phone, preferred_times, patient_note, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'requested', ?, ?, ?, ?, ?)`,
    args: [ulid(), caseId, doctorId, user.id, contactPhone, preferredTimes, note, ts, ts],
  });
  return json({ ok: true, status: 'requested' });
};
