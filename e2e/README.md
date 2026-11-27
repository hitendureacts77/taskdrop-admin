# Admin golden path (H80)

Playwright smoke for the admin. Read-only: it never changes data.

## Run

Against localhost (starts `next dev -p 3100`, needs `.env.local`):

    npm run test:e2e

Against a deployed staging admin:

    ADMIN_E2E_URL=https://<staging-admin-host> npm run test:e2e

First time: `npx playwright install chromium`.

## What it checks

- Signed out (always runs): `/login` loads ("Ops console", no console errors), every side-menu page
  (read from `src/components/Sidebar.tsx`) redirects to `/login`, `/login?error=<script>` renders no raw text (B130).
- Per staff role (admin, finance, support, sales, viewer): sign in with the username + password form, open every
  menu page the role may see (no console error, no "Something went wrong"), open by address the pages the role
  may not see (only Sales has any: money and settings pages send it back to `/`), one search, sign out.

## Env for the per-role part

`ADMIN_E2E_<ROLE>_USERNAME` and `ADMIN_E2E_<ROLE>_PASSWORD`, with ROLE one of ADMIN, FINANCE, SUPPORT, SALES, VIEWER
(for example `ADMIN_E2E_SALES_USERNAME`). A role without both values is skipped with a reason. Never commit these.
