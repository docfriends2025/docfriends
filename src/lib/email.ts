// ~/lib/email.ts — transactional email. Resend when RESEND_API_KEY is set,
// otherwise a console fallback that returns the body so dev UIs can show the link.

import type { Env } from './db';

interface SendOpts { to: string; subject: string; text: string; html?: string; from?: string; }
interface SendResult {
  ok: boolean;
  provider: 'resend' | 'console';
  id?: string;
  error?: string;
  consoleBody?: { text: string };
}

export async function sendEmail(env: Env, opts: SendOpts): Promise<SendResult> {
  const apiKey = env.RESEND_API_KEY;
  const from = opts.from ?? env.EMAIL_FROM ?? 'DocFriends <hello@docfriends.co>';

  if (apiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: opts.to, subject: opts.subject, text: opts.text, html: opts.html ?? renderHtml(opts.text) }),
      });
      const json = (await res.json()) as { id?: string; message?: string };
      if (!res.ok) return { ok: false, provider: 'resend', error: json.message ?? `HTTP ${res.status}` };
      return { ok: true, provider: 'resend', id: json.id };
    } catch (err) {
      return { ok: false, provider: 'resend', error: err instanceof Error ? err.message : 'send failed' };
    }
  }

  console.warn('═══════════════ [email:console] ═══════════════');
  console.warn(`to=${opts.to}  subject=${opts.subject}`);
  console.warn(opts.text);
  console.warn('═══════════════════════════════════════════════');
  return { ok: true, provider: 'console', consoleBody: { text: opts.text } };
}

function renderHtml(text: string): string {
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!doctype html><html><body style="font-family:Georgia,serif;background:#fcfaf5;color:#1a2238;padding:32px 24px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e8e3d6;border-radius:12px;padding:32px;">
<div style="font-family:Georgia,serif;font-size:24px;margin-bottom:16px;">DocFriends</div>
<div style="font-size:15px;line-height:1.6;white-space:pre-wrap;">${safe}</div></div>
<div style="font-size:11px;color:#999;text-align:center;margin-top:24px;">DocFriends · New York</div>
</body></html>`;
}

export function magicLinkEmail(opts: { email: string; link: string }): SendOpts {
  return {
    to: opts.email,
    subject: 'Your DocFriends sign-in link',
    text: `Hi,

Click the link below to sign in to DocFriends.

  ${opts.link}

This link expires in 15 minutes and can only be used once.
If you didn't request this, you can ignore this email.

— The DocFriends team`,
  };
}
