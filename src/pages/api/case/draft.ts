// POST /api/case/draft
// Captures the homepage intake into a `draft` case and remembers it via cookie.
// Returns { ok, next } — next routes the visitor into the conversion flow.
import type { APIRoute } from 'astro';
import { getEnv, hasDb, getDb, ulid, now } from '~/lib/db';

export const prerender = false;

const DRAFT_COOKIE = 'df_draft';

interface Payload {
  symptoms?: unknown; diagnosis?: unknown; medications?: unknown;
  questions?: unknown; files?: unknown;
}
const str = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};
const strArr = (v: unknown, n: number, len: number): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean).slice(0, n).map((s) => s.slice(0, len)) : [];

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ request, cookies, locals, clientAddress }) => {
  const env = getEnv(locals);
  let body: Payload;
  try { body = (await request.json()) as Payload; } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }

  const symptoms = str(body.symptoms, 4000);
  if (!symptoms) return json({ ok: false, error: 'Please describe what is going on.' }, 400);
  const diagnosis = str(body.diagnosis, 240);
  const medications = str(body.medications, 1000);
  const questions = strArr(body.questions, 3, 500);
  const files = Array.isArray(body.files)
    ? body.files.filter((f): f is { name: unknown; size?: unknown } => typeof f === 'object' && f != null && 'name' in f)
        .map((f) => ({ name: str((f as { name: unknown }).name, 240), size: Number((f as { size?: unknown }).size) || null }))
        .filter((f): f is { name: string; size: number | null } => !!f.name).slice(0, 50)
    : [];

  if (!hasDb(env)) {
    // No DB configured (e.g. first local run before .dev.vars) — still let them proceed.
    return json({ ok: true, next: '/case/start', persisted: false });
  }

  const id = ulid();
  const ts = now();
  try {
    const db = getDb(env);
    await db.execute({
      sql: `INSERT INTO cases (id, user_id, title, status, symptoms, diagnosis, medications, questions_json, source, client_ip, created_at, updated_at)
            VALUES (?, NULL, ?, 'draft', ?, ?, ?, ?, 'home_hero', ?, ?, ?)`,
      args: [id, symptoms.slice(0, 60), symptoms, diagnosis, medications, JSON.stringify(questions), clientAddress ?? null, ts, ts],
    });
    for (const f of files) {
      await db.execute({
        sql: `INSERT INTO case_attachments (id, case_id, file_name, size_bytes, created_at) VALUES (?, ?, ?, ?, ?)`,
        args: [ulid(), id, f.name, f.size, ts],
      });
    }
    cookies.set(DRAFT_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 7 * 24 * 3600 });
    return json({ ok: true, next: '/case/start', caseId: id, persisted: true });
  } catch (err) {
    console.error('draft case failed', err);
    return json({ ok: false, error: 'Could not save your case. Please try again.' }, 500);
  }
};
