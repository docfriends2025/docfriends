// ~/lib/portal.ts — shared helpers for the admin + doctor portals.
import { getDb, type Env } from './db';
import { parseJSON } from './format';

export interface Doctor {
  id: string; name: string; initials: string | null; specialtySlug: string | null;
  hospital: string | null; location: string | null; yearsPractice: number | null;
  rating: number; reviewCount: number;
}

function rowToDoctor(r: Record<string, unknown>): Doctor {
  return {
    id: String(r.id), name: String(r.name), initials: r.initials ? String(r.initials) : null,
    specialtySlug: r.specialty_slug ? String(r.specialty_slug) : null,
    hospital: r.hospital ? String(r.hospital) : null, location: r.location ? String(r.location) : null,
    yearsPractice: r.years_practice != null ? Number(r.years_practice) : null,
    rating: r.rating != null ? Number(r.rating) : 0, reviewCount: r.review_count != null ? Number(r.review_count) : 0,
  };
}

/** The doctor profile linked to a signed-in doctor user (active only). */
export async function doctorForUser(env: Env, userId: string): Promise<Doctor | null> {
  const r = await getDb(env).execute({
    sql: `SELECT id, name, initials, specialty_slug, hospital, location, years_practice, rating, review_count
          FROM doctors WHERE user_id = ? AND active = 1`,
    args: [userId],
  });
  return r.rows[0] ? rowToDoctor(r.rows[0] as Record<string, unknown>) : null;
}

/** Active doctors in a specialty, best-fit first. */
export async function doctorsInSpecialty(env: Env, slug: string): Promise<Doctor[]> {
  const r = await getDb(env).execute({
    sql: `SELECT id, name, initials, specialty_slug, hospital, location, years_practice, rating, review_count
          FROM doctors WHERE specialty_slug = ? AND active = 1 ORDER BY rating DESC, review_count DESC`,
    args: [slug],
  });
  return r.rows.map((x) => rowToDoctor(x as Record<string, unknown>));
}

/** Simple fit score 0–100 derived from rating (no real ML model yet). */
export const fitFromRating = (rating: number): number => Math.max(0, Math.min(100, Math.round(rating * 20)));

/** Anonymized "34F" style label — NEVER the client's name/email. */
export function ageSexCompact(demographicsJson: string | null): string {
  const d = parseJSON<{ age?: unknown; sex?: unknown }>(demographicsJson, {});
  const age = d.age != null && String(d.age).trim() ? String(d.age).trim() : null;
  const sex = d.sex ? String(d.sex).trim() : null;
  const s = sex ? sex[0].toUpperCase() : '';
  if (age && s) return `${age}${s}`;
  if (age) return age;
  if (s) return s;
  return 'Patient';
}

/** Anonymized "34, female" style label — NEVER the client's name/email. */
export function ageSexLong(demographicsJson: string | null): string {
  const d = parseJSON<{ age?: unknown; sex?: unknown }>(demographicsJson, {});
  const age = d.age != null && String(d.age).trim() ? String(d.age).trim() : null;
  const sex = d.sex ? String(d.sex).trim() : null;
  if (age && sex) return `${age}, ${sex}`;
  if (age) return String(age);
  if (sex) return sex;
  return 'Not provided';
}

export const questionsOf = (json: string | null): string[] => parseJSON<string[]>(json, []);

export function snippet(s: string | null, n = 64): string {
  if (!s) return '—';
  const t = s.trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}
