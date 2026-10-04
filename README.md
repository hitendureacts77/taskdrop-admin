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

Sign in with Google, using an account that has the `admin` role in `user_roles`. Anyone else is sent to "not authorized". In Supabase → Authentication → URL Configuration, add `http://localhost:3001/auth/callback` (and your deployed address, e.g. `https://your-admin.vercel.app/auth/callback`) to the Redirect URLs.

Other commands:

```bash
npm run typecheck   # TypeScript
npm run build       # production build
npm run db:types    # regenerate src/lib/db/database.types.ts after a schema change (needs the Supabase CLI)
```

## Deploy (Vercel)

Import this repo as a new Vercel project. The defaults are right: framework **Next.js**, root directory `./`. Add the three environment variables above, then deploy. Add the deployed `/auth/callback` address to Supabase's Redirect URLs.

## Database changes this panel expects

The database schema lives in the TaskDrop app repo (`supabase/migrations/`). Three migrations there are used by this panel and were **not yet applied to the live project** when this repo was created:

- **060_admin_earnings_daily**: adds up earnings per day in the database, so the 1-year, 5-year and all-time charts stay fast. The panel works without it; it just reads more rows.
- **061_fix_admin_resolve_dispute**: without it, `admin_resolve_dispute` fails, so the "Decide this dispute" buttons show an error and nothing changes.
- **071_crm**: adds the CRM tables and functions above. Without it the Customers pages and the notes, tags and Suspend panels on a person's page show an error.
- **066_razorpayx_hardening**: adds `admin_money_position`, which fills in the RazorpayX cards on Worker payouts. Until it's applied, those cards show "—".

## What each screen does

| Screen | What you can do |
| --- | --- |
| Dashboard | TaskDrop's earnings today and in total, money held in escrow, paid to workers today and in total, what's waiting for you, whose money is in the account |
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
| Settings | Service fee, waiting periods and more, each change confirmed first |
| Customer hub (CRM) | Follow-ups that are due, people who are suspended, every tag, recent notes and the latest messages |
| Segments (CRM) | Find a group by what they do (role, joined, not seen for N days, tag, wallet, never posted, available now), save it, message it, download it |
| Messages (CRM) | Send a message to a person, a tag, a saved segment, everyone or your current filters. The count is shown before you confirm; it lands in their notifications and sends a phone push |
| Search | Jobs and people by name |

Every button that moves money first shows exactly what will happen to whose money, and asks you to confirm.

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
