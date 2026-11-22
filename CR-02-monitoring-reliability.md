# CR-02 — Scheduled monitoring reliability

## Changes

- Scheduled monitor selection now happens inside a short database transaction.
- `FOR UPDATE SKIP LOCKED` ensures overlapping cron invocations claim different monitor rows.
- Claimed monitors receive a two-minute `nextCheckAt` lease. If a worker exits unexpectedly, the monitor becomes eligible again after the lease expires.
- A single cron invocation is capped at 10 monitors and processes the claimed batch concurrently, keeping the scheduled workload bounded for the configured 60-second route duration.
- The cron route now requests the same 10-monitor cap.

## Files changed

- `src/lib/monitoring.ts`
- `src/app/api/cron/check/route.ts`

## Validation

- Source-level review completed.
- Automated TypeScript/build validation was not run in this environment because project dependencies are not installed and Bun is unavailable.
- Database concurrency behavior still needs an integration test against PostgreSQL with two simultaneous cron invocations.

## Operational note

The two-minute lease is intentionally longer than the route's 60-second maximum duration. If the process is terminated, the monitor is retried when its lease expires.
