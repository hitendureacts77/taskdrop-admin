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
| People / a person | Everyone, their wallet, jobs posted and worked, withdrawals, ratings, contact details |
| Disputes | Open disputes, oldest first |
| Help requests | Read and reply (they get a notification in the app), mark resolved |
| Promotions | Paid job boosts |
| Reports | Jobs, people and earnings over 7 days to a year |
| Settings | Service fee, waiting periods and more, each change confirmed first |
| Search | Jobs and people by name |

Every button that moves money first shows exactly what will happen to whose money, and asks you to confirm.

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
