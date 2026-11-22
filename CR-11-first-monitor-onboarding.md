# CR-11 — First-monitor onboarding

## Included

- Reworked the empty-dashboard welcome state into a three-step explanation: choose a page, save its baseline, and review future changes.
- Added four optional starter use cases to the Add Website form: competitor pricing, product availability, product updates, and career openings.
- Selecting a starter pre-fills only the monitor name and keyword filter. The user must still enter the exact public URL, and all prefilled values remain editable.
- Added selected-state and accessible `aria-pressed` feedback to starter choices.
- No database migration or new environment variables are required.

## Verification

- Source-level review completed.
- Full TypeScript check, Next.js production build, and browser interaction tests must be run in the project environment after dependencies are installed.
