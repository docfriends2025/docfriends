// POST /api/admin/specialty  { action: 'add' | 'update' | 'toggle', ... }
// Admin only (enforced in-handler). Manage specialist categories. Specialties are referenced
// by doctors + cases, so there is NO delete — deactivate (toggle) instead.
//   add    { name, description?, position?, active? }  → slugify name to a unique slug
//   update { slug, name, description? }                → rename / edit
//   toggle { slug, active }                            → flip active
import type { APIRoute } from 'astro';
import { getEnv, hasDb, getDb } from '~/lib/db';

export const prerender = false;
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const str = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);

/** URL-safe slug: lowercase, non-alphanumeric runs → single hyphen, trimmed. */
function slugify(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  if (locals.user?.role !== 'admin') return json({ ok: false, error: 'Forbidden.' }, 403);
  if (!hasDb(env)) return json({ ok: false, error: 'Not configured.' }, 500);

  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }
  const action = str(b.action, 10);
  const db = getDb(env);

  if (action === 'add') {
    const name = str(b.name, 80);
    if (!name || name.length < 2) return json({ ok: false, error: 'Enter a name of at least 2 characters.' }, 400);
    const description = str(b.description, 300);
    const active = b.active === false ? 0 : 1;
    const base = slugify(name);
    if (!base) return json({ ok: false, error: 'That name has no usable letters or numbers.' }, 400);

    // Ensure a unique slug — append -2, -3, … on collision.
    const taken = new Set((await db.execute('SELECT slug FROM specialties')).rows.map((r) => String(r.slug)));
    let slug = base, n = 1;
    while (taken.has(slug)) { n += 1; slug = `${base}-${n}`.slice(0, 40); }

    const posRaw = Number(b.position);
    let position: number;
    if (Number.isFinite(posRaw)) position = Math.max(0, Math.floor(posRaw));
    else position = Number((await db.execute('SELECT COALESCE(MAX(position), 0) + 1 m FROM specialties')).rows[0].m);

    await db.execute({ sql: 'INSERT INTO specialties (slug, name, description, position, active) VALUES (?, ?, ?, ?, ?)', args: [slug, name, description, position, active] });
    return json({ ok: true, action: 'add', slug, name, active: !!active });
  }

  if (action === 'update') {
    const slug = str(b.slug, 40);
    const name = str(b.name, 80);
    if (!slug) return json({ ok: false, error: 'Missing specialty.' }, 400);
    if (!name || name.length < 2) return json({ ok: false, error: 'Enter a name of at least 2 characters.' }, 400);
    const exists = await db.execute({ sql: 'SELECT 1 FROM specialties WHERE slug = ?', args: [slug] });
    if (!exists.rows.length) return json({ ok: false, error: 'Specialty not found.' }, 404);
    const description = str(b.description, 300);
    await db.execute({ sql: 'UPDATE specialties SET name = ?, description = ? WHERE slug = ?', args: [name, description, slug] });
    return json({ ok: true, action: 'update', slug, name });
  }

  if (action === 'toggle') {
    const slug = str(b.slug, 40);
    if (!slug) return json({ ok: false, error: 'Missing specialty.' }, 400);
    const row = await db.execute({ sql: 'SELECT active FROM specialties WHERE slug = ?', args: [slug] });
    if (!row.rows.length) return json({ ok: false, error: 'Specialty not found.' }, 404);
    // Explicit target if provided, else flip the current value.
    const next = typeof b.active === 'boolean' ? (b.active ? 1 : 0) : (Number(row.rows[0].active) ? 0 : 1);
    await db.execute({ sql: 'UPDATE specialties SET active = ? WHERE slug = ?', args: [next, slug] });
    return json({ ok: true, action: 'toggle', slug, active: !!next });
  }

  return json({ ok: false, error: 'Unknown action.' }, 400);
};
