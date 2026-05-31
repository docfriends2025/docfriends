# DocFriends

Specialist medical second opinions — a panel of board-certified doctors reviews your
case and writes back within 24 hours.

**Stack:** Astro 5 (SSR) · Cloudflare Pages · Turso (libSQL) · magic-link auth.
Built to open and run straight from VS Code.

---

## What's in this build (Phase 1 — foundation + public surface)

| Screen | Page | Status |
|--------|------|--------|
| 2  | Homepage — editorial split hero + live case intake | ✅ built |
| 4  | FAQs — help center, search, accordion | ✅ built |
| 5  | Journal — featured story + filterable grid | ✅ built |
| 6  | Contact — channels + "send a note" form | ✅ built |
| —  | Pricing (keeps nav whole) | ✅ built |
| 7  | Conversion · sign up | ◻ next phase |
| 8  | Conversion · pick package & pay | ◻ next phase |
| 9  | Conversion · confirmation | ◻ next phase |
| 10 | Client dashboard · cases home | ◻ next phase |
| 11 | Client dashboard · opinions comparison | ◻ next phase |
| 13 | Doctor portal · inbox/kanban | ◻ next phase |
| 14 | Doctor portal · Q&A thread | ◻ next phase |
| 15 | Doctor portal · write opinion | ◻ next phase |
| 16 | Admin · overview metrics | ◻ next phase |
| 17 | Admin · case assignment | ◻ next phase |

Also working now: **magic-link auth** (passwordless email), **role-based routing**
(`client` → `/dashboard`, `doctor` → `/doctor`, `admin` → `/admin`), the **case
intake → draft** pipeline, and the **contact** endpoint. The full database schema for
*every* screen above is already in `db/schema.sql`, so later phases only add UI + a
few endpoints — no migrations to redo.

---

## Run it locally (5 minutes)

```bash
npm install
cp .dev.vars.example .dev.vars     # then paste your Turso creds into .dev.vars
```

Create a free Turso database and load the schema + seed:

```bash
# one-time: install the CLI — https://docs.turso.tech/cli/installation
turso auth login
turso db create docfriends
turso db show docfriends --url           # → TURSO_DATABASE_URL
turso db tokens create docfriends        # → TURSO_AUTH_TOKEN
# paste both into .dev.vars

# load schema + demo data
turso db shell docfriends < db/schema.sql
turso db shell docfriends < db/seed.sql
```

Start the dev server:

```bash
npm run dev          # http://localhost:4321
```

**Sign in with no email setup:** in dev (no `RESEND_API_KEY`), the sign-in page shows
the magic link on screen — click it to log in. Demo accounts from the seed:
`maya@example.com` (client) · `mehta@example.com` (doctor) · `sarah@example.com` (admin).

> Tip: `npm run db:push` / `npm run db:seed` work too — set `TURSO_DATABASE_NAME=docfriends` in your shell first.

---

## Deploy (GitHub → Cloudflare Pages)

1. Push this folder to a GitHub repo.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Build command `npm run build`, output directory `dist`, framework preset **Astro**.
4. Add environment variables (for **Production *and* Preview**):
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and optionally `RESEND_API_KEY`,
   `EMAIL_FROM`, `SITE_URL`.
5. Every push to your main branch now auto-deploys.

Real email in production: create a free key at [resend.com](https://resend.com), set
`RESEND_API_KEY` + `EMAIL_FROM`, verify your domain. Until then the app runs fine; the
dev fallback just won't show in production.

---

## Project layout

```
db/
  schema.sql        all tables (4 portals)        seed.sql   demo data
src/
  lib/    db.ts auth.ts email.ts content.ts site.ts format.ts
  layouts/BaseLayout.astro
  components/ Nav.astro Footer.astro BrandMark.astro
  pages/
    index.astro  faqs.astro  journal.astro  contact.astro  pricing.astro  sign-in.astro
    case/start.astro
    api/  auth/{request,verify,sign-out}.ts   case/draft.ts   contact.ts
  middleware.ts     attaches user + guards /dashboard /doctor /admin
astro.config.mjs  wrangler.toml  .dev.vars.example
```

## Conventions
- **Money** = US cents (int). **Time** = epoch ms (int). **IDs** = ULID (`ulid()`).
- Secrets are read via `Astro.locals.runtime.env` (see `getEnv`) — `process.env` is
  empty in the Cloudflare runtime at request time.
- Pages render even before the DB is configured (content helpers fall back to seed copies).

## Decisions (open to change)
- **Pricing**: USD, Single $149 / Council $349 / Board $549 — single package dimension.
- **Auth**: magic-link email is the live path. Google/Apple/WhatsApp appear in the
  sign-in design as the intended providers; wiring them needs provider accounts.
- **Payment**: a recorded stub will mark a case paid in the conversion flow, with a
  clean swap point for Stripe.

## Roadmap
- **Phase 2** — conversion flow (7, 8, 9) + `/api/case/submit`
- **Phase 3** — client portal (10, 11) + account + feedback
- **Phase 4** — doctor portal (13, 14, 15) + accept/message/submit-opinion APIs
- **Phase 5** — admin portal (16, 17) + assign/confirm APIs
