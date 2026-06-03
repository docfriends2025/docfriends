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

export function opinionsReadyEmail(opts: { email: string; link: string; ref: string }): SendOpts {
  return {
    to: opts.email,
    subject: 'Your second opinions are ready — DocFriends',
    text: `Good news — your panel has finished reviewing your case${opts.ref ? ` (#${opts.ref})` : ''}.

Your specialists' written opinions are ready to read now:

  ${opts.link}

You'll see each doctor's verdict, their answers to your questions, and what they'd do next. As always, this is guidance to talk through with your own doctor — not a prescription.

— The DocFriends team`,
  };
}

export function verifyEmail(opts: { email: string; link: string }): SendOpts {
  return {
    to: opts.email,
    subject: 'Confirm your email — DocFriends',
    text: `Welcome to DocFriends.

Confirm your email to activate your account and sign in:

  ${opts.link}

This link expires in 24 hours and can only be used once. If you didn't create an account, you can ignore this email.

— The DocFriends team`,
  };
}

export function resetEmail(opts: { email: string; link: string }): SendOpts {
  return {
    to: opts.email,
    subject: 'Reset your password — DocFriends',
    text: `We received a request to reset your DocFriends password.

Set a new password here:

  ${opts.link}

This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore it — your password won't change.

— The DocFriends team`,
  };
}

export function doctorApprovedEmail(opts: { email: string; name: string; link: string }): SendOpts {
  return {
    to: opts.email,
    subject: 'Your DocFriends application is approved',
    text: `Welcome aboard, ${opts.name || 'Doctor'}.

Your application has been approved — your DocFriends doctor account is now active. Sign in to see your inbox and start reviewing cases:

  ${opts.link}

Thank you for joining the network.

— The DocFriends team`,
  };
}

export function doctorRejectedEmail(opts: { email: string; name: string; reason: string | null }): SendOpts {
  return {
    to: opts.email,
    subject: 'Update on your DocFriends application',
    text: `Hello ${opts.name || 'there'},

Thank you for your interest in joining DocFriends. After review, we're not able to approve your application at this time.${opts.reason ? `\n\nNote from our team: ${opts.reason}` : ''}

If you believe this was in error or your credentials have changed, reply to this email and we'll take another look.

— The DocFriends team`,
  };
}

export function existingAccountEmail(opts: { email: string; signInLink: string; resetLink: string }): SendOpts {
  return {
    to: opts.email,
    subject: 'You already have a DocFriends account',
    text: `Someone (probably you) tried to sign up with this email, but you already have a DocFriends account.

Sign in:        ${opts.signInLink}
Forgot password? ${opts.resetLink}

If this wasn't you, no action is needed — no account was created or changed.

— The DocFriends team`,
  };
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
