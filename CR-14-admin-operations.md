# CR-14 — Admin dashboard and platform operations

## Included

- Admin user search by name/email, with plan and subscription-status filters.
- Operations indicators for due monitors, pending/sending/failed email deliveries, and unprocessed Razorpay webhook events.
- Recent Razorpay webhook event visibility, including processed/pending state.
- Razorpay-managed subscriptions are protected from manual plan/status overrides in the admin UI and API, preventing the local subscription record from drifting away from the payment provider.
- Last-admin protection is enforced inside a transaction with row locks, preventing removal of the final administrator during concurrent admin actions.
- Admin role, manual plan and status updates run in a database transaction; manual plan changes retain a billing-history record.

## Apply

No schema migration or new environment variables are required.

Copy the contents of `changeradar-work/` over the existing project, then run:

```bash
bun run typecheck
bun run build
```

## Verification notes

The source files were syntax-transpiled and the ZIP archives were integrity-checked. Full typecheck/build and live PostgreSQL/provider tests must be run in the project's configured environment.
