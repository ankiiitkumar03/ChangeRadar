# CR-09 — Production deployment and verification

## Added in this milestone
- `GET /api/health`: no-store readiness probe. It checks core configuration and PostgreSQL connectivity; production also requires `CRON_SECRET`. It returns HTTP 200 only when the relevant checks pass, otherwise HTTP 503. It never returns secret values.
- `bun run check:env --production`: validates required environment variables, PostgreSQL URL format, production HTTPS origins, minimum secret lengths, and all-or-none Razorpay and Resend configuration. It warns if production is configured with Razorpay Test Mode keys. Without `--production`, local development does not require cron, and incomplete optional email configuration is a warning.
- `bun run smoke:production -- https://YOUR_DOMAIN`: checks the homepage, sign-in, sign-up, and readiness endpoint.
- Corrected the old README billing description so it reflects Razorpay rather than the pre-CR08 Stripe placeholder.

## Deployment order
1. Set the Vercel Root Directory to `.` (the repository root). `package.json` and `vercel.json` are both at this level.
2. Add production environment variables from `.env.example`. Use production `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` with the exact HTTPS origin. Use secrets of at least 32 characters for `BETTER_AUTH_SECRET` and `CRON_SECRET`.
3. Configure `DATABASE_URL` for the production PostgreSQL database. Confirm the database provider allows connections from the deployment platform and that connection limits are appropriate.
4. Before deploying, run `bun install --frozen-lockfile`, `bun run check:env --production`, `bun run typecheck`, and `bun run build` locally or in CI with the production configuration (do not commit `.env`).
5. Apply pending migrations once against the production database using `bun run db:migrate`. Back up the database first. Do not run `db:push` against production.
6. Deploy. Confirm `/api/health` returns HTTP 200. Then run `bun run smoke:production -- https://YOUR_DOMAIN`.
7. Verify sign-up, sign-in, password reset (if Resend configured), create/pause/resume/delete monitor, manual check, detected change, notification delivery, and scheduled cron execution.
8. Keep Razorpay in Test Mode until the INR pricing page, Dashboard plan amounts, webhook secret, and complete subscription lifecycle have been tested. Switch to Live Mode only after account approval and a successful end-to-end test. The current public pricing catalogue must be aligned with INR before accepting live payments.

## Vercel settings to verify
- Root Directory: `.` (repository root; this is where `package.json` lives).
- Build Command: `bun run build` (or the equivalent detected command).
- Install Command: `bun install --frozen-lockfile`.
- Cron: `vercel.json` schedules `/api/cron/check` hourly. Ensure `CRON_SECRET` is configured in the Production environment. Confirm the deployed cron invocation is authorized in Vercel logs.
- Runtime: API routes requiring Node APIs explicitly use the Node.js runtime where configured.

## Verification commands
```bash
bun install --frozen-lockfile
bun run check:env --production
bun run typecheck
bun run build
bun run db:migrate
bun run smoke:production -- https://YOUR_DOMAIN
```

## Operational checks after launch
- Watch Vercel function logs for database, cron, fetch, and webhook errors.
- In Razorpay Dashboard, confirm webhook deliveries return 2xx. Retry failed deliveries only after reviewing idempotency and event status.
- Check that the hourly cron runs and that due monitors advance their `lastCheckedAt`/`nextCheckAt` values.
- Check email provider delivery logs; application notification state alone does not prove inbox delivery.
- Take and test database backups. Establish a retention policy for snapshots and check runs before usage grows.

## Limits / not claimed as verified here
No production credentials, production database, Vercel project, DNS, or Razorpay account were available in this workspace. This milestone adds readiness and smoke-test tooling and deployment instructions; it does not deploy the application or claim that production checkout, migrations, email delivery, cron, or database connectivity have been tested live. The smoke test must be run against the user's deployed URL.
