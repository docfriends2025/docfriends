// src/middleware.ts — attach the signed-in user to Astro.locals on every request,
// and guard the role-gated portals.
import { defineMiddleware } from 'astro:middleware';
import { getCurrentUser } from '~/lib/auth';
import { getEnv, hasDb } from '~/lib/db';

// Path prefix → role required to enter it.
const GUARDS: { prefix: string; role: 'client' | 'doctor' | 'admin' }[] = [
  { prefix: '/dashboard', role: 'client' },
  { prefix: '/account',   role: 'client' },
  { prefix: '/doctor',    role: 'doctor' },
  { prefix: '/admin',     role: 'admin' },
];

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  if (path.startsWith('/_astro/') || path.startsWith('/favicon') || path.startsWith('/assets/')) {
    return next();
  }

  const env = getEnv(context.locals);
  context.locals.user = null;
  if (hasDb(env)) {
    try {
      context.locals.user = await getCurrentUser(env, context.cookies);
    } catch (err) {
      console.error('middleware: getCurrentUser threw', err);
    }
  }

  const guard = GUARDS.find((g) => path === g.prefix || path.startsWith(g.prefix + '/'));
  if (guard) {
    const user = context.locals.user;
    if (!user) return context.redirect(`/sign-in?next=${encodeURIComponent(path)}`);
    if (user.role !== guard.role) {
      // Signed in but wrong role — send to their own home.
      const home = user.role === 'doctor' ? '/doctor' : user.role === 'admin' ? '/admin' : '/dashboard';
      return context.redirect(home);
    }
  }

  return next();
});
