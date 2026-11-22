# CR-04 — Database consistency

## What changed

- A monitor row is locked with `SELECT ... FOR UPDATE` while its latest snapshot is read and the result is persisted. This serializes manual and scheduled check commits for the same monitor.
- Baseline snapshot + monitor state + check-run are committed in one PostgreSQL transaction.
- Unchanged check state + check-run are committed together.
- New snapshot + change + monitor state + check-run + notification record are committed together.
- Failed monitor state + failed check-run are committed together. If the monitor was deleted while the network request was in flight, no orphan check-run is inserted.
- Network requests, AI summarization, and email delivery are outside the database transaction. External services cannot participate in a PostgreSQL transaction.
- Change notifications are created in the same transaction as the change. Email delivery status is updated afterward; a delivery failure does not turn a successfully persisted check into a failed check.

## Deployment

No schema migration is required. Apply the patch and deploy the updated application/worker code.

## Verification still required

Run `bun install`, `bun run typecheck`, and `bun run build` in the project environment, then test baseline, unchanged, changed, failed-fetch, and overlapping manual/scheduled checks against a PostgreSQL test database.
