# CR-06 — Dashboard UX

## Scope

Improve the monitor-list workflow without changing monitoring behavior, database schema, API contracts, or authentication.

## Changes

- Added client-side monitor search by display name and URL.
- Added status filters for all, actively monitoring, paused, and error/needs-attention monitors.
- Added live counts for each status and a visible filtered-result count.
- Added clear-search and reset-filter actions, plus a dedicated no-results state.
- Kept monitor cards and their existing check/pause/edit/delete actions unchanged.

## Verification

- Review the monitor list with mixed active, paused, and error monitors.
- Search by a partial website name and by hostname.
- Combine search with each status filter, then clear filters.
- Confirm the existing monitor detail links and actions still work.
- Run `bun run typecheck` and `bun run build` in an environment with dependencies installed.

No database migration or environment variable changes are required.
