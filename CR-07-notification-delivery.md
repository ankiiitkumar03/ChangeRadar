# CR-07 — Notification delivery reliability

## Changes

- Added durable email delivery metadata: attempt count, next retry time, delivery lease, sent timestamp, and Resend message ID.
- New transient failures and interrupted deliveries are retried by the authenticated hourly cron route. Historical failed notifications are not replayed during rollout, avoiding a burst of stale emails; previously unconfigured notifications remain unconfigured until a new change is detected.
- Delivery claims use PostgreSQL row locks with `SKIP LOCKED`, preventing two cron invocations from processing the same notification concurrently.
- Retry schedule eligibility is 5 minutes, 30 minutes, and 2 hours after the initial attempt; maximum is four total attempts. The current Vercel cron polls hourly, so actual retries happen on the next hourly run after they become eligible.
- Every attempt uses a stable Resend `Idempotency-Key` derived from the notification ID to reduce duplicate sends when a request times out after provider acceptance. Provider requests have an 8-second timeout.
- Email retries do not change the already-committed monitor check or change record.
- Notification UI now distinguishes queued, sending, sent, failed/retrying, not-configured, and disabled email states.

## Migration

Run `bun run db:migrate` to apply `drizzle/0001_cr07_notification_delivery.sql` before deploying this version. No new environment variables are required. New delivery fields default safely for existing rows; historical `failed` rows are assigned the exhausted attempt count so they are not replayed, while historical `not_configured` rows remain untouched and are not part of the retry queue.

## Verification

Run `bun run typecheck` and `bun run build`, then verify a successful delivery, a temporary Resend failure followed by a retry, and a timed-out `sending` row whose lease has expired. Live provider/database tests are not run as part of this source patch.
