# TaskDrop admin panel

Staff-only web panel for running TaskDrop: money, jobs, people, disputes, refunds, help requests and settings. It talks to the same Supabase project as the TaskDrop app, so everything you see and change here is the live app's data.

This is its own codebase, separate from the TaskDrop app repo. The only thing the two share is the database.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev                  # http://localhost:3001
```

`.env.local` needs:

| Key | Where to find it | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Already filled in |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page, "anon / publishable" | Safe in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page, "service_role" | **Server only. Never add `NEXT_PUBLIC_`.** Needed for the Refunds list, Razorpay payment ids and people's phone/email. Everything else works without it. |

Sign in with Google, using an account that has the `admin` role in `user_roles`. Anyone else is sent to "not authorized". `ADMIN_EMAIL` (and `ADMIN_PHONE`, for accounts made with a mobile number) can name one account or several separated by commas, e.g. `a@gmail.com,b@gmail.com`; it is an extra door lock on top of the database role, and each person's staff role still decides what they can change. Leave both empty and the database role alone decides. In Supabase → Authentication → URL Configuration, add `http://localhost:3001/auth/callback` (and your deployed address, e.g. `https://your-admin.vercel.app/auth/callback`) to the Redirect URLs.

Other commands:

```bash
npm run typecheck   # TypeScript
npm run build       # production build
npm run db:types    # regenerate src/lib/db/database.types.ts after a schema change (needs the Supabase CLI)
```

## Environments

- **Test environment: the cloud Supabase project** (`wjxvingpfbfvkfqhrguj`). There is no local Supabase and no Docker; whatever is in the cloud is treated as testing, with fake data. It is **shared with the old app and old admin** (your testers use them) until Phase 9, so a destructive change there affects their data too.
- Locally: `npm run dev` on http://localhost:3001, using the cloud project's keys from `.env.local`.
- Hosted: `admin.taskdrop.in` (Vercel). In Supabase → Authentication → URL Configuration, the Redirect URLs need `http://localhost:3001/auth/callback` and `https://admin.taskdrop.in/auth/callback` (add the second once the domain is connected in Vercel).

## Branches and pull requests

Only `main` and `redesigned-2.0` exist. All new work goes into `redesigned-2.0`; `main` is promoted by hand after testing. Cut a short branch from `redesigned-2.0` for each piece of work (for example `upgrade/phase-1-sentry`), open a pull request into `redesigned-2.0`, fix or answer CI and the CodeRabbit review, merge, and delete the branch. The full plan is `docs/UPGRADE_PLAN.md` in the app repo.

## Deploy (Vercel)

Import this repo as a new Vercel project. The defaults are right: framework **Next.js**, root directory `./`. Add the three environment variables above, then deploy. Add the deployed `/auth/callback` address to Supabase's Redirect URLs.

## Database changes this panel expects

The database schema lives in the TaskDrop app repo (`supabase/migrations/`). Three migrations there are used by this panel and were **not yet applied to the live project** when this repo was created:

- **060_admin_earnings_daily**: adds up earnings per day in the database, so the 1-year, 5-year and all-time charts stay fast. The panel works without it; it just reads more rows.
- **061_fix_admin_resolve_dispute**: without it, `admin_resolve_dispute` fails, so the "Decide this dispute" buttons show an error and nothing changes.
- **071_crm**: adds the CRM tables and functions above. Without it the Customers pages and the notes, tags and Suspend panels on a person's page show an error.
- **091_admin_live_events**: the Dashboard's live strip and feed, and the "Live" light in the top bar. Without it they stay hidden and the top bar says "Live off"; everything else works.
- **066_razorpayx_hardening**: adds `admin_money_position`, which fills in the RazorpayX cards on Worker payouts. Until it's applied, those cards show "—".

## What each screen does

| Screen | What you can do |
| --- | --- |
| Dashboard | **Live:** a "Right now" strip (online now, getting quotes, in progress, overdue, waiting for OK, disputes, help requests, posted today) and a live feed of everything happening in the app, updating by itself. Then TaskDrop's earnings today and in total, money held in escrow, paid to workers today and in total, what's waiting for you, whose money is in the account |
| Needs you now | One list of everything waiting on a person (withdrawals, refunds, disputes, help requests, copyright notices), most urgent first, each with how long it has waited and how long is left of TaskDrop's promise (24 hours, 48 for disputes). On the Dashboard and its own page; updates by itself. The **Alerts** button in the top bar gives a chime and a desktop notification for new ones (only the kinds your staff role can act on; your own choice, remembered in this browser; switched off for you if your team setting turns alerts off) |
| Earnings & escrow | Earnings by type (today / chosen range / total), chart from 7 days to all time with a comparison line, every job in escrow, who each rupee belongs to |
| Earnings entries | Every line in the company ledger, filterable by day and type |
| Worker payouts | Withdrawals that need you, ones on the way, and settled ones; check with RazorpayX, pay by hand, or put money back in a worker's earnings |
| Refunds | Posters owed money from cancelled jobs; "Send refund" asks Razorpay to return it |
| Jobs / a job | Every job with filters; a job's money, timeline, quotes, reviews and dispute decision |
| People / a person | Everyone, their wallet, jobs posted and worked, withdrawals, ratings, contact details. On a person: private notes with follow-up dates, tags, a message box, an activity timeline, and **Suspend** (blocks sign-in and withdrawals; jobs and money stay put). The list filters by tag or suspended and downloads as a spreadsheet |
| Disputes | Open disputes, oldest first |
| Help requests | Read and reply (they get a notification in the app), mark resolved |
| Promotions | Paid job boosts |
| Reports | Jobs, people and earnings over 7 days to a year |
| Admin & configuration | Tabs: **Team & access** (every admin with their staff role, alerts switch, sign-in, allowlist and authenticator status; add someone by @username or Google address with a role, change a role, remove someone), **Money & timing** (service fee, waiting periods and more, each change confirmed first), **App switches** (authenticator requirement, developer sign-in), **Integrations** (Supabase, service key, sign-in allowlist, RazorpayX, Razorpay, push), **System health** (each feature's table or function checked live, queues, latest activity), **Audit log** (every change the database records, with before and after) and **My security** |
| Customer hub (CRM) | Follow-ups that are due, people who are suspended, every tag, recent notes and the latest messages |
| Segments (CRM) | Find a group by what they do (role, joined, not seen for N days, tag, wallet, never posted, available now), save it, message it, download it |
| Messages (CRM) | Send a message to a person, a tag, a saved segment, everyone or your current filters. The count is shown before you confirm; it lands in their notifications and sends a phone push |
| Search | Jobs and people by name |

Every button that moves money first shows exactly what will happen to whose money, and asks you to confirm.

## Staff roles

Every admin holds `admin` in `user_roles`; `admin_staff` (migration `089_staff_roles`, in the TaskDrop app repo) narrows what they may change:

| Role | Can change |
| --- | --- |
| Admin (default, no row) | Everything |
| Finance | Payouts, refunds, wallet changes, dispute decisions |
| Support | Help requests, CRM notes, tags, segments and messages, suspensions, copyright |
| Sales | Customers, notes, follow-ups, leads, tags, messages and moderation (the People area, like Support); no money, settings, switches, team or automation rules; gets no alerts |
| Viewer | Nothing; sees everything |

Settings, app switches, the team and deleting accounts are Admin only. The database enforces this with a trigger on each table those actions write (`private.require_staff_permission`), so it holds whatever client calls. The panel checks first (`src/lib/staff.ts`) to say so plainly, and is the only check for refunds and RazorpayX, which run through edge functions as the service role. Changing a role needs an authenticator code; there is always at least one full Admin, and nobody can change their own role.

`admin_staff.notify` sends staff alerts (an in-app notification and push, kind `staff_alert`): withdrawals and disputes to Admin and Finance, help requests to Admin and Support. Anyone can switch their own alerts on or off.

## CRM

Notes, tags, suspensions, segments and messages live in tables that only a signed-in admin can read, and are written only through database functions that check for an admin again (migration `071_crm`, in the TaskDrop app repo). A suspension bans the person's sign-in, ends their sessions and push, and `request_withdrawal` refuses them; it never moves their jobs or money. A message is one row per person in the app's `notifications` table, which the app's existing trigger turns into a phone push. One message reaches at most 5,000 people.

The spreadsheet download (`/api/crm/export`) checks for an admin itself and includes email and phone only when `SUPABASE_SERVICE_ROLE_KEY` is set.

## How it's built

- Next.js 15 (App Router, Server Components and Server Actions), React 19, TypeScript
- Supabase: `@supabase/ssr` for the signed-in admin's session (RLS applies), and a service-role client used read-only for the three things an admin session can't read (`src/lib/supabase/service.ts`, server only)
- Plain CSS in `src/app/globals.css` with design tokens; Plus Jakarta Sans

```
src/
  app/(dashboard)/    one folder per screen
  app/login/          Google sign-in
  components/views/   the screens
  components/         shared pieces: sidebar, cards, chart, confirm step
  lib/data.ts         every database read
  lib/actions.ts      every database write (Server Actions), each re-checks admin
  lib/db/             generated database types
  middleware.ts       refreshes the Supabase session on every request
```
