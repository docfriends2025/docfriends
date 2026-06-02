// ~/lib/cases.ts — shared reads for the conversion funnel (sign-up → checkout → confirm).
import { getDb, hasDb, type Env } from './db';
import { parseJSON } from './format';

/** The intake captured on the homepage, plus the commerce state we branch on. */
export interface CaseDraft {
  id: string;
  symptoms: string | null;
  diagnosis: string | null;
  medications: string | null;
  questions: string[];
  files: string[];
  userId: string | null;
  paymentStatus: string;   // unpaid | paid | refunded
  packageSlug: string | null;
  ref: string | null;
}

/** Load a case by id with its attachments, or null if missing / no DB. Never throws. */
export async function loadDraft(env: Env, draftId: string | null): Promise<CaseDraft | null> {
  if (!draftId || !hasDb(env)) return null;
  try {
    const db = getDb(env);
    const res = await db.execute({
      sql: `SELECT id, symptoms, diagnosis, medications, questions_json,
                   user_id, payment_status, package_slug, ref
            FROM cases WHERE id = ?`,
      args: [draftId],
    });
    const row = res.rows[0];
    if (!row) return null;
    const att = await db.execute({ sql: 'SELECT file_name FROM case_attachments WHERE case_id = ?', args: [draftId] });
    return {
      id: String(row.id),
      symptoms: row.symptoms ? String(row.symptoms) : null,
      diagnosis: row.diagnosis ? String(row.diagnosis) : null,
      medications: row.medications ? String(row.medications) : null,
      questions: parseJSON<string[]>(row.questions_json ? String(row.questions_json) : null, []),
      files: att.rows.map((a) => String(a.file_name)),
      userId: row.user_id ? String(row.user_id) : null,
      paymentStatus: row.payment_status ? String(row.payment_status) : 'unpaid',
      packageSlug: row.package_slug ? String(row.package_slug) : null,
      ref: row.ref ? String(row.ref) : null,
    };
  } catch (e) {
    console.error('loadDraft', e);
    return null;
  }
}
