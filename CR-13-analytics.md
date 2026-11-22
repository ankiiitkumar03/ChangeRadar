# CR-13 — Analytics & Product Usage Insights

## Included
- Authenticated `/dashboard/analytics` page with a 30-day reporting window.
- Summary cards for total check runs, detected changes, successful-check rate and failed runs.
- Daily check/change activity chart using the existing ActivityChart component.
- Per-monitor performance table showing checks, changes, failures and change rate.
- Navigation entry in the dashboard sidebar and page title support.
- Empty state and explanatory metric definitions.

## Data and privacy
All analytics are derived from the signed-in user's own `check_runs` and `monitors` rows. No cross-user or platform-wide analytics are exposed. The page does not add tracking scripts or collect page-view analytics.

## Database
No schema change or migration required.

## Validation
Run `bun run typecheck` and `bun run build`, then sign in and open `/dashboard/analytics`. Verify the chart and monitor metrics against the corresponding user's `check_runs` records.
