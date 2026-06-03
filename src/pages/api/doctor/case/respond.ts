// POST /api/doctor/case/respond  { caseId, action: 'accept' | 'decline' }  — doctor only.
// Only affects a case the signed-in doctor is assigned to.
import type { APIRoute } from 'astro';
import { getEnv, hasDb, getDb, now } from '~/lib/db';
import { doctorForUser } from '~/lib/portal';

export const prerender = false;
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  if (locals.user?.role !== 'doctor') return json({ ok: false, error: 'Forbidden.' }, 403);
  if (!hasDb(env)) return json({ ok: false, error: 'Not configured.' }, 500);
  const doctor = await doctorForUser(env, locals.user.id);
  if (!doctor) return json({ ok: false, error: 'No doctor profile linked.' }, 403);

  let body: { caseId?: unknown; action?: unknown };
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }
  const caseId = str(body.caseId, 40);
  const action = str(body.action, 10);
  if (!caseId || (action !== 'accept' && action !== 'decline')) return json({ ok: false, error: 'Bad request.' }, 400);

  const db = getDb(env);
  const cd = await db.execute({ sql: 'SELECT status FROM case_doctors WHERE case_id = ? AND doctor_id = ?', args: [caseId, doctor.id] });
  if (!cd.rows.length) return json({ ok: false, error: 'You are not assigned to this case.' }, 403);
  if (String(cd.rows[0].status) === 'submitted') return json({ ok: false, error: 'Already submitted.' }, 409);

  const ts = now();
  if (action === 'accept') {
    await db.execute({ sql: "UPDATE case_doctors SET status = 'accepted', responded_at = ? WHERE case_id = ? AND doctor_id = ?", args: [ts, caseId, doctor.id] });
    await db.execute({ sql: "UPDATE cases SET status = 'in_progress', updated_at = ? WHERE id = ? AND status = 'matched'", args: [ts, caseId] });
  } else {
    await db.execute({ sql: "UPDATE case_doctors SET status = 'declined', responded_at = ? WHERE case_id = ? AND doctor_id = ?", args: [ts, caseId, doctor.id] });
  }
  return json({ ok: true, action });
};
