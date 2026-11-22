# CR-12 — Account security and preferences

## Included
- Settings page now groups profile, password security, global email alert preference, account details, and integration status.
- Added a per-user `user_preferences` record with email alerts enabled by default.
- Added authenticated `GET` and `PATCH /api/preferences` endpoints. The PATCH endpoint accepts only a boolean `emailAlerts` value and scopes updates to the signed-in user.
- Added a settings switch for globally pausing/resuming email alerts. In-app notifications continue to work.
- Immediate email delivery and queued retry delivery both respect the global preference. Disabling email alerts marks outstanding retryable deliveries as disabled when the worker next picks them up.
- Password change continues to use Better Auth and revokes other sessions.

## Database
Run `bun run db:migrate` to apply `drizzle/0003_cr12_account_preferences.sql`. Existing users receive a default preference row when they visit Settings; the default is enabled.

## Verification
Archive integrity and source-level checks are run when packaging. Full TypeScript/build and live PostgreSQL tests require installing project dependencies and configuring the database.
