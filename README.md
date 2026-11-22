# ChangeRadar

Website change monitoring SaaS: add public URLs, get scheduled checks, before/after diffs, AI summaries and email alerts.

**Stack:** Next.js 16 · React 19 · Tailwind 4 · PostgreSQL (Drizzle ORM) · better-auth (email/password + Google) · Resend · OpenAI-compatible AI API.

## Run it

```bash
bun install
cp .env.example .env.local  # fill in DATABASE_URL and BETTER_AUTH_SECRET; set CRON_SECRET for scheduled checks
bun run db:migrate          # applies all pending SQL migrations (or `bun run db:push`)
bun run dev --port 4000
```

For local development, manual checks work without `CRON_SECRET`; scheduled checks require it. Generate a 32-byte secret in PowerShell or any terminal with Node.js:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Set the generated value as `CRON_SECRET` in `.env.local` for scheduled checks. Email and payment integrations are optional for local use; configure them only when you have their provider credentials.

## What works / what needs configuring

| Capability | Status | Needs |
|---|---|---|
| Landing, auth, dashboard, monitors, detail page, diff, changes, notifications, settings, admin | Built | `DATABASE_URL`, `BETTER_AUTH_SECRET` |
| Scheduled checks | Built (`/api/cron/check`, hourly via `vercel.json`) | `CRON_SECRET` + a scheduler (Vercel Cron works out of the box) |
| Email alerts & password reset | Built; shows a setup state if missing | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| AI summaries | Built; falls back to a rule-based summary | `ZAI_API_KEY`, `ZAI_API_BASE` |
| Google sign-in | Built; button hidden/disabled if missing | `GOOGLE_CLIENT_ID/SECRET` |
| **Paid checkout (Razorpay Subscriptions)** | Built in CR-08; activate only after INR pricing and Test Mode lifecycle checks. | Razorpay keys, three monthly INR plan IDs, webhook secret |

Nothing in the UI fabricates monitoring data: with no monitors there are empty states, with missing integrations there are setup notices.

## Known gaps (be aware before launch)

1. **Payments.** Razorpay Subscriptions are implemented in CR-08. Configure INR plan IDs and test checkout, renewals, failed payments, duplicate webhooks, and cancellation before enabling Live Mode. The current public pricing catalogue must be aligned with INR first.
2. **Supabase.** The original brief asked for Supabase Auth. This build uses plain Postgres + better-auth (you can point `DATABASE_URL` at a Supabase database). Swapping auth would be a rewrite of `src/lib/auth*.ts` and session helpers.
3. **JavaScript-rendered pages.** Checks fetch raw HTML; pages that render content client-side return little/no text and the monitor reports that clearly. A separate browser-worker architecture is needed before adding Playwright safely to the Vercel deployment.
4. **Type checking:** run `bun run typecheck` before deployment; production builds no longer suppress TypeScript errors.
5. Set `BETTER_AUTH_URL` in production (it restricts trusted origins).
6. **Outbound URL security.** Monitor URLs are restricted to HTTP/HTTPS on ports 80/443. DNS answers are checked and the selected public IP is pinned to the outbound socket; redirects are revalidated independently. This reduces DNS-rebinding and SSRF risk, but does not replace production egress controls (for example, a network-level deny rule for private, link-local, and metadata ranges).

## CR-04 — Database consistency

The monitoring pipeline now persists baseline snapshots, unchanged checks, detected changes, monitor state, check-run records, and change notifications in PostgreSQL transactions. A per-monitor row lock serializes concurrent check commits. AI summaries and email delivery run after the transaction commits; delivery status is recorded separately so an email failure cannot invalidate a successfully detected change. See `CR-04-database-consistency.md` for details and verification steps.

## CR-05 — Monitoring extraction and noise reduction

The text pipeline now removes common non-content and explicitly hidden HTML elements before extracting readable text, normalizes Unicode, and safely handles malformed numeric HTML entities. Keyword tracking now has deterministic semantics: when tracked terms are absent, the monitor stores a stable “No tracked keywords found” baseline, so unrelated page edits do not trigger alerts and the later appearance of a tracked term does. Ignore-only filters that remove every line also produce a stable empty-result marker. Keyword inputs are limited to 20 entries of up to 80 characters each.

JavaScript-rendered pages remain unsupported in this milestone; the current fetcher intentionally remains a lightweight server-side HTTP client.

## CR-06 — Dashboard UX

The monitors page now supports client-side search by monitor name or URL, status filters (all, monitoring, paused, needs attention), live status counts, a filtered-result count, and clear/reset controls. Existing monitor cards and actions remain unchanged. No database migration or new environment variables are required. See `CR-06-dashboard-ux.md` for manual verification steps.


## CR-07 — Notification delivery reliability

Email alerts now persist attempt counts, retry schedules, delivery leases, sent timestamps, and provider message IDs. The authenticated hourly cron retries pending/failed deliveries with bounded backoff eligibility (5 minutes, 30 minutes, then 2 hours; four total attempts); actual retries run on the next hourly poll. PostgreSQL row locks prevent concurrent cron invocations from claiming the same notification, and a stable Resend idempotency key reduces duplicate sends after ambiguous network failures. The Notifications page shows queued/sending/retrying delivery states. Apply `drizzle/0001_cr07_notification_delivery.sql` with `bun run db:migrate` before deploying. See `CR-07-notification-delivery.md`.

## CR-09 — Production readiness

`GET /api/health` checks critical configuration and PostgreSQL connectivity. Local development does not require the scheduled-check secret; production readiness does. Run `bun run check:env --production` before deployment and `bun run smoke:production -- https://YOUR_DOMAIN` after deployment. Follow `CR-09-production-readiness.md` for the deployment sequence and manual end-to-end checks.

## CR-10 — SEO and public discoverability

The public landing page now has canonical/Open Graph/Twitter metadata. `robots.txt` excludes private app and auth routes, `sitemap.xml` lists the public homepage when `NEXT_PUBLIC_APP_URL` is configured, and a web app manifest is available. Set `NEXT_PUBLIC_APP_URL` to the exact production HTTPS origin. See `CR-10-seo-discoverability.md`.
## CR-11 — First-monitor onboarding

The empty dashboard now explains the first three steps, and the Add Website form includes editable starter presets for competitor pricing, product availability, product updates, and career openings. Starter presets never insert a website URL; the user must provide the exact page to monitor. See `CR-11-first-monitor-onboarding.md`.
