# CR-15 — UI polish and launch preparation

## Included

- Added a keyboard-accessible “Skip to main content” link in the authenticated workspace.
- Added a stable main-content landmark and focus target.
- Made the current workspace page title visible in the mobile header.
- Improved the mobile navigation width for narrow screens and exposed its expanded state to assistive technology.
- Exposed monitor usage as an accessible progress bar with numeric values and readable value text.
- Added consistent visible keyboard focus, touch-action refinements, anchor scroll offsets, mobile safe-area padding, and a basic print stylesheet.
- Kept the existing reduced-motion handling intact.

## Database and environment

- No database migration required.
- No new environment variables.

## Validation

- Source-level checks and archive integrity checks are performed when packaging.
- Full dependency-backed TypeScript/build/browser tests require installing project dependencies and configuring the app environment. Do not treat those as passed unless run in the target environment.

## Launch checklist

1. Configure production database and run `bun run db:migrate`.
2. Configure Better Auth, email/Resend, cron secret, and Razorpay secrets/plan IDs.
3. Set `NEXT_PUBLIC_APP_URL` to the final HTTPS domain.
4. Configure Razorpay webhook URL and subscribed events; verify webhook secret matches the app.
5. Run `bun run check:env`, `bun run typecheck`, and `bun run build`.
6. Deploy to a staging domain and run `bun run smoke:production -- https://YOUR_STAGING_DOMAIN`.
7. Test signup/sign-in/reset, create/pause/delete monitor, baseline/change detection, in-app/email notifications, preferences, billing checkout and webhook lifecycle, and admin access.
8. Verify cron execution, database backups, error monitoring, and domain/SSL before enabling live payments.
9. Run a small live Razorpay transaction and verify activation, renewal/cancellation state, and refund/support process before public launch.

## Known launch caveats

- Live payment processing, email delivery, scheduled cron execution, and production database behavior must be verified with real credentials in staging.
- Confirm the customer-facing INR prices exactly match the Razorpay plan amounts before enabling checkout.
