// POST /api/admin/case/specialty  { caseId, specialty }  — admin only. Sets a case's
// specialty_slug (only when not already set). The specialty is the routing key.
import type { APIRoute } from 'astro';
import { getEnv, hasDb, getDb, now } from '~/lib/db';

export const prerender = false;
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  if (locals.user?.role !== 'admin') return json({ ok: false, error: 'Forbidden.' }, 403);
  if (!hasDb(env)) return json({ ok: false, error: 'Not configured.' }, 500);

  let body: { caseId?: unknown; specialty?: unknown };
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }
  const caseId = str(body.caseId, 40);
  const specialty = str(body.specialty, 40);
  if (!caseId || !specialty) return json({ ok: false, error: 'Missing case or specialty.' }, 400);

  const db = getDb(env);
  const sp = await db.execute({ sql: 'SELECT 1 FROM specialties WHERE slug = ? AND active = 1', args: [specialty] });
  if (!sp.rows.length) return json({ ok: false, error: 'Unknown specialty.' }, 400);

  const res = await db.execute({
    sql: 'UPDATE cases SET specialty_slug = ?, updated_at = ? WHERE id = ? AND specialty_slug IS NULL',
    args: [specialty, now(), caseId],
  });
  if (res.rowsAffected === 0) {
    const exists = await db.execute({ sql: 'SELECT specialty_slug FROM cases WHERE id = ?', args: [caseId] });
    if (!exists.rows.length) return json({ ok: false, error: 'Case not found.' }, 404);
    return json({ ok: false, error: 'Specialty is already set for this case.' }, 409);
  }
  return json({ ok: true, specialty });
};
