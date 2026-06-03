// POST /api/admin/case/assign  { caseId, doctorIds[] }  — admin only.
// Creates case_doctors rows (status 'offered') for active doctors in the case's
// specialty, capped at the package opinion_count, and advances the case to 'matched'.
import type { APIRoute } from 'astro';
import { getEnv, hasDb, getDb, ulid, now } from '~/lib/db';
import { fitFromRating } from '~/lib/portal';

export const prerender = false;
const COMMISSION_CENTS = 8000; // flat per-opinion payout for now
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  if (locals.user?.role !== 'admin') return json({ ok: false, error: 'Forbidden.' }, 403);
  if (!hasDb(env)) return json({ ok: false, error: 'Not configured.' }, 500);

  let body: { caseId?: unknown; doctorIds?: unknown };
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }
  const caseId = str(body.caseId, 40);
  const doctorIds = Array.isArray(body.doctorIds) ? body.doctorIds.filter((x): x is string => typeof x === 'string').slice(0, 10) : [];
  if (!caseId || !doctorIds.length) return json({ ok: false, error: 'Pick at least one doctor.' }, 400);

  const db = getDb(env);
  const cRes = await db.execute({
    sql: `SELECT c.id, c.specialty_slug, p.opinion_count
          FROM cases c LEFT JOIN packages p ON p.slug = c.package_slug WHERE c.id = ?`,
    args: [caseId],
  });
  const c = cRes.rows[0] as Record<string, unknown> | undefined;
  if (!c) return json({ ok: false, error: 'Case not found.' }, 404);
  if (!c.specialty_slug) return json({ ok: false, error: 'Set the specialty before assigning.' }, 409);
  const opinionCount = c.opinion_count != null ? Number(c.opinion_count) : 0;

  // Current active (non-declined) assignments.
  const cur = await db.execute({ sql: "SELECT doctor_id FROM case_doctors WHERE case_id = ? AND status != 'declined'", args: [caseId] });
  const already = new Set(cur.rows.map((r) => String(r.doctor_id)));
  const slotsLeft = Math.max(0, opinionCount - already.size);
  if (slotsLeft <= 0) return json({ ok: false, error: 'This case already has a full panel.' }, 409);

  // Validate: doctors must be active + in the case's specialty + not already on the panel.
  const placeholders = doctorIds.map(() => '?').join(',');
  const dRes = await db.execute({
    sql: `SELECT id, rating FROM doctors WHERE active = 1 AND specialty_slug = ? AND id IN (${placeholders})`,
    args: [String(c.specialty_slug), ...doctorIds],
  });
  const valid = dRes.rows.map((r) => ({ id: String(r.id), rating: r.rating != null ? Number(r.rating) : 0 })).filter((d) => !already.has(d.id));
  if (!valid.length) return json({ ok: false, error: 'No valid doctors to assign (must be active and in the case specialty).' }, 400);
  const toAssign = valid.slice(0, slotsLeft);

  const ts = now();
  for (const d of toAssign) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO case_doctors (id, case_id, doctor_id, status, fit_score, commission_cents, offered_at)
            VALUES (?, ?, ?, 'offered', ?, ?, ?)`,
      args: [ulid(), caseId, d.id, fitFromRating(d.rating), COMMISSION_CENTS, ts],
    });
  }
  await db.execute({ sql: "UPDATE cases SET status = 'matched', updated_at = ? WHERE id = ?", args: [ts, caseId] });
  return json({ ok: true, assigned: toAssign.length });
};
