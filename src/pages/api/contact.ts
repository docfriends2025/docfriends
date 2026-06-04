// POST /api/contact { name, email, topic, message }
import type { APIRoute } from 'astro';
import { getEnv, hasDb, getDb, ulid, now } from '~/lib/db';

export const prerender = false;
const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const json = (b: object, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  let body: { name?: unknown; email?: unknown; topic?: unknown; message?: unknown };
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }

  const email = str(body.email, 254);
  const message = str(body.message, 5000);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'Please enter a valid email.' }, 400);
  if (!message) return json({ ok: false, error: 'Please write a message.' }, 400);

  // No DB yet → accept gracefully so the form still works in early setup.
  if (!hasDb(env)) return json({ ok: true, persisted: false });

  try {
    await getDb(env).execute({
      sql: 'INSERT INTO contact_messages (id, name, email, topic, body, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [ulid(), str(body.name, 120), email, str(body.topic, 80), message, now()],
    });
    return json({ ok: true, persisted: true });
  } catch (err) {
    console.error('contact failed', err);
    return json({ ok: false, error: 'Could not send. Please email hello@docfriends.co directly.' }, 500);
  }
};
