/// <reference path="../.astro/types.d.ts" />

import type { User } from '~/lib/auth';

type Runtime = import('@astrojs/cloudflare').Runtime<{
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  SITE_URL?: string;
}>;

declare global {
  namespace App {
    interface Locals extends Runtime {
      user: User | null;
    }
  }
}

export {};
