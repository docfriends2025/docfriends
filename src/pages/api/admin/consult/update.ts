// POST /api/admin/consult/update  { consultId, action: 'confirm'|'done'|'cancel', scheduledAt?, adminNote? }
// Admin only (enforced in-handler). The call itself is placed manually by the team —
// this only updates the queue. No telephony API.
import type { APIRoute } from 'astro';
import { getEnv, hasDb, getDb, now } from '~/lib/db';

export const prerender = false;
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  if (locals.user?.role !== 'admin') return json({ ok: false, error: 'Forbidden.' }, 403);
  if (!hasDb(env)) return json({ ok: false, error: 'Not configured.' }, 500);

  let body: { consultId?: unknown; action?: unknown; scheduledAt?: unknown; adminNote?: unknown };
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }
  const consultId = str(body.consultId, 40);
  const action = str(body.action, 10);
  const adminNote = str(body.adminNote, 1000);
  const scheduledAt = Number.isFinite(Number(body.scheduledAt)) && Number(body.scheduledAt) > 0 ? Math.floor(Number(body.scheduledAt)) : null;
  const statusFor: Record<string, string> = { confirm: 'confirmed', done: 'done', cancel: 'cancelled' };
  if (!consultId || !action || !statusFor[action]) return json({ ok: false, error: 'Bad request.' }, 400);

  const db = getDb(env);
  const exists = await db.execute({ sql: 'SELECT 1 FROM teleconsults WHERE id = ?', args: [consultId] });
  if (!exists.rows.length) return json({ ok: false, error: 'Consult not found.' }, 404);

  const ts = now();
  const status = statusFor[action];
  await db.execute({
    sql: `UPDATE teleconsults
          SET status = ?,
              confirmed_at = CASE WHEN ? = 'confirmed' THEN ? ELSE confirmed_at END,
              scheduled_at = COALESCE(?, scheduled_at),
              admin_note   = COALESCE(?, admin_note),
              updated_at   = ?
          WHERE id = ?`,
    args: [status, status, ts, scheduledAt, adminNote, ts, consultId],
  });
  return json({ ok: true, status });
};
