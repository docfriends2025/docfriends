// POST /api/case/checkout  { package, name? }
// Authenticated. Claims the draft case (df_draft cookie) to the signed-in user,
// records a (stub) payment, and advances the case to `submitted` / `paid`.
// Idempotent: a case already paid returns its ref without charging again.
import type { APIRoute } from 'astro';
import { getEnv, hasDb, getDb, ulid, now } from '~/lib/db';
import { getPackages } from '~/lib/content';

export const prerender = false;

const DRAFT_COOKIE = 'df_draft';
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** Short human-friendly case ref (e.g. "4821"), unique against existing cases. */
async function generateRef(db: ReturnType<typeof getDb>): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    const ref = String(1000 + (a[0] % 9000));
    const hit = await db.execute({ sql: 'SELECT 1 FROM cases WHERE ref = ?', args: [ref] });
    if (!hit.rows.length) return ref;
  }
  return String(now()).slice(-6);
}

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const env = getEnv(locals);
  const user = locals.user;
  if (!user) return json({ ok: false, error: 'Please sign in to continue.' }, 401);
  if (!hasDb(env)) return json({ ok: false, error: 'Checkout is not configured yet.' }, 500);

  let body: { package?: unknown; name?: unknown };
  try { body = (await request.json()) as typeof body; } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }

  const packageSlug = str(body.package, 40);
  const billingName = str(body.name, 120);
  if (!packageSlug) return json({ ok: false, error: 'Please choose a package.' }, 400);

  const caseId = cookies.get(DRAFT_COOKIE)?.value ?? null;
  if (!caseId) return json({ ok: false, error: 'We could not find your case. Please start again.', next: '/' }, 400);

  const packages = await getPackages(env);
  const pkg = packages.find((p) => p.slug === packageSlug);
  if (!pkg) return json({ ok: false, error: 'That package is not available.' }, 400);

  const db = getDb(env);
  let row: Record<string, unknown> | undefined;
  try {
    const res = await db.execute({
      sql: 'SELECT id, user_id, payment_status, ref FROM cases WHERE id = ?',
      args: [caseId],
    });
    row = res.rows[0] as Record<string, unknown> | undefined;
  } catch (err) {
    console.error('checkout lookup failed', err);
    return json({ ok: false, error: 'We could not load your case. Please try again.' }, 500);
  }
  if (!row) return json({ ok: false, error: 'We could not find your case. Please start again.', next: '/' }, 400);

  const ownerId = row.user_id ? String(row.user_id) : null;
  if (ownerId && ownerId !== user.id) return json({ ok: false, error: 'This case belongs to another account.' }, 403);

  // Idempotent — already paid (e.g. a double submit or refresh).
  if (String(row.payment_status) === 'paid') {
    return json({ ok: true, ref: row.ref ? String(row.ref) : null, alreadyPaid: true });
  }

  const ts = now();
  const ref = row.ref ? String(row.ref) : await generateRef(db);
  const demographics = JSON.stringify({ name: billingName ?? user.name ?? null });

  try {
    await db.execute({
      sql: `INSERT INTO payments (id, case_id, user_id, amount_cents, status, provider, provider_id, payload_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'paid', 'stub', ?, ?, ?, ?)`,
      args: [ulid(), caseId, user.id, pkg.priceCents, 'demo_' + ulid(), JSON.stringify({ package: pkg.slug, note: 'demo checkout — no card charged' }), ts, ts],
    });
    await db.execute({
      sql: `UPDATE cases
            SET user_id = ?, ref = COALESCE(ref, ?), package_slug = ?, price_cents = ?,
                payment_status = 'paid', status = 'submitted',
                demographics_json = COALESCE(demographics_json, ?), updated_at = ?
            WHERE id = ?`,
      args: [user.id, ref, pkg.slug, pkg.priceCents, demographics, ts, caseId],
    });
    if (billingName && !user.name) {
      await db.execute({ sql: 'UPDATE users SET name = ? WHERE id = ? AND name IS NULL', args: [billingName, user.id] });
    }
    await db.execute({
      sql: `INSERT INTO audit_log (id, entity, entity_id, action, actor, payload, created_at)
            VALUES (?, 'case', ?, 'checkout_paid', ?, ?, ?)`,
      args: [ulid(), caseId, user.id, JSON.stringify({ package: pkg.slug, amount_cents: pkg.priceCents, ref }), ts],
    });
    return json({ ok: true, ref });
  } catch (err) {
    console.error('checkout failed', err);
    return json({ ok: false, error: 'We could not complete checkout. Please try again.' }, 500);
  }
};
