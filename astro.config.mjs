// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// DocFriends — Astro 5 on Cloudflare Pages, Turso (libSQL) at the edge.
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: 'compile',
  }),
  site: 'https://docfriends.pages.dev',
});
