// POST /api/admin/doctor/review  { doctorId, action: 'approve' | 'reject', notes? }
// Admin only (enforced in-handler). Approve → verified=1, active=1, approved, role=doctor.
// Reject → rejected, active=0. Emails the applicant. Never logs credentials.
import type { APIRoute } from 'astro';
import { getEnv, hasDb, getDb, now } from '~/lib/db';
import { sendEmail, doctorApprovedEmail, doctorRejectedEmail } from '~/lib/email';

export const prerender = false;
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  if (locals.user?.role !== 'admin') return json({ ok: false, error: 'Forbidden.' }, 403);
  if (!hasDb(env)) return json({ ok: false, error: 'Not configured.' }, 500);

  let body: { doctorId?: unknown; action?: unknown; notes?: unknown };
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }
  const doctorId = str(body.doctorId, 40);
  const action = str(body.action, 10);
  const notes = str(body.notes, 1000);
  if (!doctorId || (action !== 'approve' && action !== 'reject')) return json({ ok: false, error: 'Bad request.' }, 400);

  const db = getDb(env);
  const dr = await db.execute({
    sql: 'SELECT d.user_id, d.name, d.application_status, u.email FROM doctors d LEFT JOIN users u ON u.id = d.user_id WHERE d.id = ?',
    args: [doctorId],
  });
  const row = dr.rows[0];
  if (!row) return json({ ok: false, error: 'Application not found.' }, 404);
  const userId = row.user_id ? String(row.user_id) : null;
  const email = row.email ? String(row.email) : null;
  const name = row.name ? String(row.name) : 'Doctor';
  const ts = now();

  if (action === 'approve') {
    await db.execute({
      sql: "UPDATE doctors SET verified = 1, active = 1, application_status = 'approved', reviewed_by = ?, reviewed_at = ?, review_notes = ? WHERE id = ?",
      args: [locals.user.id, ts, notes, doctorId],
    });
    if (userId) await db.execute({ sql: "UPDATE users SET role = 'doctor' WHERE id = ?", args: [userId] });
    if (email) { try { await sendEmail(env, doctorApprovedEmail({ email, name, link: (env.SITE_URL || new URL(request.url).origin) + '/doctor' })); } catch (e) { console.error('approve email failed', e instanceof Error ? e.message : 'err'); } }
    return json({ ok: true, status: 'approved' });
  }

  await db.execute({
    sql: "UPDATE doctors SET active = 0, application_status = 'rejected', reviewed_by = ?, reviewed_at = ?, review_notes = ? WHERE id = ?",
    args: [locals.user.id, ts, notes, doctorId],
  });
  if (email) { try { await sendEmail(env, doctorRejectedEmail({ email, name, reason: notes })); } catch (e) { console.error('reject email failed', e instanceof Error ? e.message : 'err'); } }
  return json({ ok: true, status: 'rejected' });
};
