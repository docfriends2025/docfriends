// POST /api/doctor/opinion  { caseId, submit, verdict, diagnosisReview, nextSteps, redFlags, answers[] }
// Doctor only; assigned cases only. Upserts the doctor's opinion. On submit, marks this
// doctor's case_doctors row 'submitted' and, when every assigned doctor has submitted,
// advances the case to 'delivered'.
import type { APIRoute } from 'astro';
import { getEnv, hasDb, getDb, ulid, now } from '~/lib/db';
import { doctorForUser } from '~/lib/portal';
import { sendEmail, opinionsReadyEmail } from '~/lib/email';

export const prerender = false;
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  if (locals.user?.role !== 'doctor') return json({ ok: false, error: 'Forbidden.' }, 403);
  if (!hasDb(env)) return json({ ok: false, error: 'Not configured.' }, 500);
  const doctor = await doctorForUser(env, locals.user.id);
  if (!doctor) return json({ ok: false, error: 'No doctor profile linked.' }, 403);

  let body: { caseId?: unknown; submit?: unknown; verdict?: unknown; diagnosisReview?: unknown; nextSteps?: unknown; redFlags?: unknown; answers?: unknown; availableTeleconsult?: unknown };
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }
  const caseId = typeof body.caseId === 'string' ? body.caseId.trim().slice(0, 40) : null;
  const submit = body.submit === true;
  if (!caseId) return json({ ok: false, error: 'Missing case.' }, 400);

  const verdict = str(body.verdict, 400);
  const diagnosisReview = str(body.diagnosisReview, 4000);
  const nextSteps = str(body.nextSteps, 4000);
  const redFlags = str(body.redFlags, 2000);
  const answers = Array.isArray(body.answers) ? body.answers.map((a) => str(a, 2000)).slice(0, 10) : [];
  const availableTeleconsult = body.availableTeleconsult === true ? 1 : 0;
  if (submit && !verdict) return json({ ok: false, error: 'Add a one-line verdict before submitting.' }, 400);

  const db = getDb(env);
  const cd = await db.execute({ sql: 'SELECT status FROM case_doctors WHERE case_id = ? AND doctor_id = ?', args: [caseId, doctor.id] });
  if (!cd.rows.length) return json({ ok: false, error: 'You are not assigned to this case.' }, 403);
  if (String(cd.rows[0].status) === 'declined') return json({ ok: false, error: 'You declined this case.' }, 409);

  const ts = now();
  const status = submit ? 'submitted' : 'draft';
  const submittedAt = submit ? ts : null;
  await db.execute({
    sql: `INSERT INTO opinions (id, case_id, doctor_id, verdict, diagnosis_review, next_steps, answers_json, red_flags, available_teleconsult, status, created_at, updated_at, submitted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(case_id, doctor_id) DO UPDATE SET
            verdict=excluded.verdict, diagnosis_review=excluded.diagnosis_review, next_steps=excluded.next_steps,
            answers_json=excluded.answers_json, red_flags=excluded.red_flags, available_teleconsult=excluded.available_teleconsult,
            status=excluded.status, updated_at=excluded.updated_at, submitted_at=COALESCE(excluded.submitted_at, opinions.submitted_at)`,
    args: [ulid(), caseId, doctor.id, verdict, diagnosisReview, nextSteps, JSON.stringify(answers), redFlags, availableTeleconsult, status, ts, ts, submittedAt],
  });

  // Advance the doctor's assignment row.
  const cdStatus = submit ? 'submitted' : 'drafting';
  await db.execute({
    sql: `UPDATE case_doctors SET status = ?, submitted_at = COALESCE(?, submitted_at) WHERE case_id = ? AND doctor_id = ?`,
    args: [cdStatus, submittedAt, caseId, doctor.id],
  });

  let caseStatus: string | undefined;
  let emailed = false;
  let emailProvider: string | undefined;
  if (submit) {
    const roll = await db.execute({
      sql: `SELECT SUM(CASE WHEN status='submitted' THEN 1 ELSE 0 END) submitted,
                   SUM(CASE WHEN status NOT IN ('submitted','declined') THEN 1 ELSE 0 END) pending
            FROM case_doctors WHERE case_id = ?`,
      args: [caseId],
    });
    const submittedN = Number(roll.rows[0].submitted ?? 0);
    const pendingN = Number(roll.rows[0].pending ?? 0);
    if (pendingN === 0 && submittedN >= 1) {
      // Guarded so the delivering flip happens exactly once — email only when it flips.
      const flip = await db.execute({
        sql: "UPDATE cases SET status = 'delivered', delivered_at = ?, updated_at = ? WHERE id = ? AND status != 'delivered'",
        args: [ts, ts, caseId],
      });
      caseStatus = 'delivered';
      if (flip.rowsAffected > 0) {
        // Notify the case owner that their opinions are ready. Best-effort: a send
        // failure must NOT block delivery or the submit. Never log keys.
        try {
          const own = await db.execute({ sql: 'SELECT u.email, c.ref FROM cases c JOIN users u ON u.id = c.user_id WHERE c.id = ?', args: [caseId] });
          const ownerEmail = own.rows[0]?.email ? String(own.rows[0].email) : null;
          if (ownerEmail) {
            const origin = env.SITE_URL || new URL(request.url).origin;
            const ref = own.rows[0]?.ref ? String(own.rows[0].ref) : '';
            const r = await sendEmail(env, opinionsReadyEmail({ email: ownerEmail, link: `${origin}/dashboard/cases/${caseId}`, ref }));
            emailed = r.ok;
            emailProvider = r.provider;
            if (!r.ok) console.error('delivery email not sent', r.error ?? 'unknown');
          }
        } catch (err) {
          console.error('delivery email threw', err instanceof Error ? err.message : 'error');
        }
      }
    } else {
      caseStatus = 'in_progress';
    }
  }
  return json({ ok: true, submitted: submit, caseStatus, ...(submit ? { emailed, emailProvider } : {}) });
};
