# Admin panel redesign: staging build plan (28 Nov 2026)

Status: **plan only, nothing built.** The design (`03-design-brief.md`, `design/admin-design.html`) is **waiting for your review**. This plan starts when you say **"build the admin design"**.

Inputs: `01-current-admin-inventory.md`, `02-user-app-features-inventory.md`, `03-design-brief.md` (section numbers below point to it).

---

## 1. In plain words

- We build the new admin **on staging first** (`admin.taskdrop.in`, fake people, Razorpay test mode).
- The old admin keeps working everywhere until you say "promote the admin design". Production never shows the new screens before that (section 3).
- Five phases. Each phase is a few small pull requests into `redesigned-2.0`. You can look at staging after each phase.
- Money, security, database changes and anything that shows private data are done by **Opus**. Screens, wiring, styling and tests are done by **Sonnet**.

## 2. Where the work happens

| What | Where |
|---|---|
| Admin code | Admin repo `Taskdrop administrator`, short branches into `redesigned-2.0` (PR, then merge) |
| Database changes (new admin functions) | User repo `Taskdrop user/supabase/migrations`, forward only, next free number at build time (last used today: 243). Short branches into `redesigned-2.0` |
| Where migrations are applied | **Staging Supabase only** (`wjxvingpfbfvkfqhrguj`). Production's database gets them only through "Release to production" (decision 57) |
| Staging admin | `admin.taskdrop.in`, built from `redesigned-2.0` |
| Production admin | `taskdrop-admin-production`, **also built from `redesigned-2.0`** (owner, 21 Nov). So every merge reaches it: see section 3 |
| Local testing | `npm run dev` on `localhost:3001`, pointed at staging Supabase |
| Money tests | Razorpay **test mode** only (the staging test account). Never a live key |

## 3. Keeping production safe while we build (the production gate)

Because production admin is rebuilt from the same branch, the new screens must be **switched off in production** until you promote them.

**Proposed gate (two locks, both must be open):**

1. **Build setting:** `NEXT_PUBLIC_ADMIN_V2=on` is set **only** on the staging admin project (Vercel `taskdrop-admin` today; the staging Worker after the Cloudflare move). The production project never gets it. Missing = old admin.
2. **Server check:** the `environment` app control must read **exactly** `staging`. Anything else (production, blank, unknown word, failed read) = old admin. Note: this is stricter than the ribbon rule in `src/lib/environment.ts`, which treats "unknown" as staging so the warning can only show wrongly. The gate must fail **closed**, so it gets its own helper.

**What the gate does:**
- Gate closed: the old sidebar, old pages and old routes, unchanged. New routes (`/inbox`, `/money/holds`, and so on) return "not found".
- Gate open: the new shell and new routes. Old routes redirect to their new home (table in brief section 4).
- Old pages are **not deleted** until after the promote. Both shells use the same server functions.

**Database side:**
- New admin functions are added only to staging until "Release to production".
- Existing functions keep working for the old admin: new options are added with safe defaults (for example `p_hide_test boolean default true`), never by breaking an existing call.
- If the production admin ever calls a function that is not on production yet, the screen shows "Not set up on this server yet" (brief section 10), never an error. With the gate closed this cannot happen.

This gate is **owner decision 7** (section 9).

## 4. The phases

Tags: `[opus]` = money, security, migrations, functions that move money or show private data, MFA tier checks. `[sonnet]` = screens from the spec, wiring existing functions, CSS, tests, end-to-end runs.

Every step ends with: the plan line ticked in `ULTIMATE_PLAN.md` (task 1.22), the HTML rebuilt, both committed.

### P1: Shell + Inbox + Money holds & moves + task dispute page

| Step | Who | Files / area | Backend (new function or migration) | Done when | Checks |
|---|---|---|---|---|---|
| P1.0 Production gate | [opus] | New `src/lib/admin-v2.ts` (strict gate) + test; `src/app/(dashboard)/layout.tsx`; `src/middleware.ts` (new routes 404 when closed) | None | With either lock closed the old admin renders exactly as today; with both open the new shell shows. A failed environment read means closed | Unit tests for every combination (unset, production, blank, unknown, read error, staging). Build with and without the setting |
| P1.1 Look and feel | [sonnet] | `src/app/globals.css` tokens (light + dark, brief section 8); Plus Jakarta Sans self-hosted (`next/font/local`); dark mode (system + manual switch, remembered per browser) | None | Tokens match the design file; sidebar stays dark green in dark mode (decision 5); text contrast 4.5:1 in both themes | Build, lint, typecheck; contrast spot check |
| P1.2 Shell | [sonnet] | New `src/components/shell/` (sidebar with 8 sections, top bar, phone bottom bar + More drawer); reuse `EnvRibbon.tsx` and `environment.ts` for the gold ribbon / "Production" badge | None | Matches the design at 1440 and 375 wide; no sideways scroll at 375 | Build; Playwright screenshot at both widths |
| P1.3 Shared pieces | [sonnet] | New `src/components/v2/` : Pill, Big number, Card, Wait bar, Table that stacks on phone, Tabs, Filter chips, Toast with Undo, Drawer, Empty / Loading / Not set up / Error states, dashed "New - needs building" card | None | Each piece used by at least one P1 screen; states worded as in brief section 10 | Build, lint, typecheck |
| P1.4 Role-aware nav | [sonnet] | Shell + `src/lib/staff-roles.ts`, `src/lib/view-only.ts` | None (roles already on the server) | Each of the 5 roles sees only its sections (brief section 5); locked items show a reason; Viewer buttons say "View only" | Unit test of the role-to-nav map; Playwright per role |
| P1.5 Confirm tiers | [opus] | New `src/components/v2/Confirm.tsx` (tier 1 toast + Undo, tier 2 modal, tier 3 typed word + 6-digit code); server helper that re-checks the tier and a fresh MFA code on every tier 3 action (reuse `mfa-route.ts`, `mfa-switch.ts`) | None | Tier 3 button stays disabled until word and code are right; the server refuses a tier 3 call without fresh MFA even if the page is bypassed; the environment line shows in every tier 2-3 modal | Unit tests for the server check (no code, old code, wrong word); security review |
| P1.6 Hide test data (server) | [opus] | User repo migration | Helper `private.is_test_user(uuid)` (the `fa4e0001-*` people) and `p_hide_test boolean default true` on the list and stats functions | Test people and their tasks vanish from lists and every number when on; old admin calls still work unchanged | SQL checks on staging: counts with and without; old call signature still works |
| P1.7 Hide test data (screen) | [sonnet] | Top-bar switch, on by default, remembered per browser; passed to every list | Uses P1.6 | Switch changes every list and number on the page | Playwright: count changes when switched |
| P1.8 Global search (server) | [opus] | User repo migration | `admin_search` (people, tasks, payments, tickets by id, phone or name), respecting the phone and email masking rule (only Admin and Support see full contact, H33) | Sales, Finance and Viewer never get a full phone or email back | SQL check per role; security review |
| P1.9 Global search (screen) | [sonnet] | Top-bar search with dropdown; "See all results" page replaces `/search` (redirect when gate open) | Uses P1.8 | Find a person by phone end digits, a task by id, a payment by Razorpay id | Playwright |
| P1.10 Inbox (server) | [opus] | User repo migration | `admin_inbox`: one list over withdrawals, refunds, disputes, tickets, copyright, alarms, failed money moves, alerts, with the 24 h / 48 h promise times; assign and snooze (small new table); filtered per role on the server | Each role gets only its items; oldest first; assign and snooze stick | SQL checks per role on staging |
| P1.11 Inbox + Today (screens) | [sonnet] | New `/inbox` and new Today (`/`), Sales version kept; old `/needs-you` and `/alerts` redirect when gate open | Uses P1.10 + existing dashboard data | Filter chips, wait bars, one primary action per row; Today shows blockers, 4 big numbers, top 3 Inbox items, live feed, health line | Playwright per role |
| P1.12 Holds & moves (server) | [opus] | User repo migration | New read functions `admin_plan_b_moves` (filters, try count, next try) and `admin_money_webhook_events`; wire existing `admin_plan_b_overview` and `admin_plan_b_retry_move` behind tier 3 | Retry runs only with typed word + fresh MFA, writes an audit line, and cannot double-pay (re-check the move is still failed) | Razorpay test mode: fail a test move, retry it, check the ledger and the nightly money check |
| P1.13 Money Overview + Holds & moves (screens) | [sonnet] | New `/money` overview and `/money/holds` | Uses P1.12 | Matches the design; failed moves also appear in Inbox; money errors say "No money moved" | Playwright; Opus checks the confirm wiring |
| P1.14 Dispute decision (server) | [opus] | User repo migration if needed | Check `admin_resolve_dispute` supports a split amount; add it if missing. Release / refund / split + reason, tier 3 | A split pays both sides the right amounts and the ledger balances; a disputed task has no raw "release" button | Razorpay test mode: release, refund and split on three test tasks |
| P1.15 Task page + tasks list (screens) | [sonnet] | `/tasks` list (Disputes filter, area, kind, overdue); task page: header, dispute card, evidence tabs (Timeline, Chat excerpt, Proof photos, Offers), decision form, money card, people; `/disputes` redirects when gate open | Uses P1.14 + existing task functions | Matches the design; decision uses the tier 3 modal | Playwright per role |
| P1.16 Smoke tests | [sonnet] | New `e2e/` in the admin repo (Playwright, a new dev package: checked first per the playbook); staging test staff accounts, one per role | None | Every new route × 5 roles opens with no error; locked items locked | Playwright run on `localhost:3001` against staging |
| P1.17 Phase check | [opus] | Whole P1 diff | - | Gate verified closed on a production-style build; review notes fixed | Security review of each PR; final look before the last merge |

### P2: Person page + app switches and settings + audit log

| Step | Who | Files / area | Backend | Done when | Checks |
|---|---|---|---|---|---|
| P2.1 Person actions (server) | [opus] | User repo migration | `admin_ban_user`, `admin_suspend_until`, `admin_unlock_phone`, `admin_raise_user_limit`, `admin_clear_self_dealing`, `admin_reveal_private` (address, phone, chat: writes an audit line) | Ban is Admin only + tier 3; reveal always leaves an audit line; nobody acts on their own account | SQL checks per role; security review |
| P2.2 People list + person page | [sonnet] | `/users` list (filters, CSV via existing export audit), person page: profile, Hire/Earn stats, money (read), tasks, devices, safety history, notes & follow-ups, history | Uses P2.1 + existing | Matches the design; "Show phone (recorded)" wording | Playwright per role |
| P2.3 Person action buttons | [sonnet] | Wire warn, suspend until, sign out everywhere, rename / clear photo, reset age check, unlock, raise limits, delete (shows blockers), ban | Uses P2.1 + existing | Each uses the tier in brief section 7 | Playwright; Opus checks each tier |
| P2.4 Other task money actions (server) | [opus] | User repo migration | `admin_force_complete`, `admin_force_unassign`, `admin_waive_cancel_fine`, `admin_refund_topup` | Each is tier 3, audited, ledger balances | Razorpay test mode on test tasks |
| P2.5 Settings with tiers (server) | [opus] | User repo migration | `admin_set_setting` checks the tier and fresh MFA on the server for risky keys (`dev_otp_for_all`, `money_paused`, signups, maintenance) and writes before/after; `admin_set_money_mode` (`money_flow`, `money_provider`), Admin + MFA only | A risky key cannot change without fresh MFA even by a direct call | SQL checks; security review |
| P2.6 App switches + Fees & switches (screens) | [sonnet] | New Settings > App switches (search, groups, dead keys hidden, "Extra check" tag, "What happens" for ON and OFF); Money > Fees & switches | Uses P2.5 | `dev_otp_for_all` ON shows as a red launch blocker on Today and here | Playwright per role |
| P2.7 Payouts, Refunds, Money check moved | [sonnet] | Move `/payouts`, `/refunds`, `/money/reconcile` into the Money section, same functions; UPI QR drawer | None new | Old routes redirect when gate open; same results as before | Playwright; Opus checks the tier 3 wiring |
| P2.8 Audit log in plain sentences | [sonnet] | New `src/lib/audit-sentence.ts` (key → plain label map) + test; Settings > Audit log with filters and expandable before/after | None | Every action type in the last 30 days on staging reads as a sentence; unknown keys fall back to a safe generic line | Unit test over every known key |
| P2.9 My security | [sonnet] | `/security` moves to Settings > My security and the avatar menu | None | Same MFA flow as today | Playwright |
| P2.10 Phase check | [opus] | Whole P2 diff | - | Gate still closed in production | Security review; Playwright run |

### P3: Safety, Support, Feedback, Growth, Reports

| Step | Who | Files / area | Backend | Done when | Checks |
|---|---|---|---|---|---|
| P3.1 Queues and counts (server) | [opus] | User repo migrations | `admin_task_moderation_queue` + decide; `admin_hunt_finds` queue + hide; ticket assign; `admin_earn_goal_mix`, `admin_guest_funnel` (counts only, no names); broadcast returns an exact count and sends to that count only | No personal data in count functions; broadcast never sends to more than the confirm showed, test people excluded | SQL checks; security review |
| P3.2 Safety | [sonnet] | Safety section, 5 tabs: Reported content (incl. reviews), Text & video checks, Skills catalog (existing functions), City Hunt photos, Copyright (moved) | Uses P3.1 | Matches design; actions use their tiers | Playwright per role |
| P3.3 Support + Feedback board | [sonnet] | Help requests (list, conversation, reply, assign, resolve); Feedback board moved; "merge" shown as New card | Uses P3.1 | Matches design | Playwright |
| P3.4 Growth | [sonnet] | Segments, Broadcast (segment → exact count → type the count), Leads & follow-ups, Automatic follow-ups (from `/settings/rules`), Promotions; Coupons and Email sequences as New cards | Uses P3.1 + existing CRM functions | Old `/crm/*` routes redirect when gate open | Playwright |
| P3.5 Reports & numbers | [sonnet] | Funnel, retention, by area, earn-goal mix, guest to sign-up, Staff tab (from `/team/performance`), CSV | Uses P3.1 + existing | Sales cannot see raw money | Playwright per role |
| P3.6 Phase check | [opus] | Whole P3 diff | - | - | Security review; Playwright run |

### P4: System health, Content, Launch checklist, Team

| Step | Who | Files / area | Backend | Done when | Checks |
|---|---|---|---|---|---|
| P4.1 Health and readiness (server) | [opus] | User repo migrations | `admin_cron_jobs`, `admin_cron_run_now`, `admin_cron_pause` (money jobs are tier 3), `admin_usage` (Inngest executions, places quota, SMS caps, media), `admin_launch_readiness` (dev code, App Check, live keys, environment, MFA; read only) | Pausing a money job needs tier 3; readiness never shows a secret value | SQL checks; security review |
| P4.2 System health | [sonnet] | Settings > System health: jobs, Inngest usage vs limit, outbox, places quota, SMS caps, Sentry issues, App Check, connected services (from `/settings/integrations`) | Uses P4.1 | Matches design | Playwright |
| P4.3 Content | [sonnet] | Settings > Content: banner with preview, highlights & trending (existing); New cards for the rest | None new | Publish banner is tier 2 | Playwright |
| P4.4 Launch checklist | [sonnet] | Settings > Launch checklist, one fix link per line; blockers also on Today | Uses P4.1 | Matches design | Playwright |
| P4.5 Team & access (server side of actions) | [opus] | Add staff, change role (tier 3 + MFA), end all staff sessions | Existing staff functions; check the rules: at least one Admin, nobody changes their own role | Rules hold even by a direct call | SQL checks; security review |
| P4.6 Team & access (screen) | [sonnet] | Staff list, role, MFA on/off, last seen, role table | Uses P4.5 | Matches design | Playwright |
| P4.7 Redirect sweep | [sonnet] | Every old route from brief section 4 redirects when gate open | None | No old route is a dead end | Playwright over the full old route list |
| P4.8 Phase check | [opus] | Whole P4 diff + a full run over all phases | - | Ready for your promote decision | Security review; full Playwright run × 5 roles |

### P5: The "New - needs building" items you pick

Each one starts only on your word ("build <item>"). Recommended order (decision 3):

| Order | Item | Who | Backend | Note |
|---|---|---|---|---|
| 1 | Content editor: walkthrough YouTube link + banner | [opus] table + function, [sonnet] screen + the app reads the link from the server instead of `WALKTHROUGH_VIDEO_URL` | New content table | Small user-app change, so an app update |
| 2 | Launch areas (allowed areas + "coming soon" text) | [opus] table + rules, [sonnet] screen + app read | New table | Ties to decision 38 (your launch areas) |
| 3 | Home ideas, Big Days, explainers, legal versions, guest reads switch, push test + dead-token cleanup | [opus] tables, [sonnet] screens | New tables | One at a time |
| After launch | Coupons (money, needs your decision), Loops email sequences, DataFast, feedback merge | [opus] for coupons | New | Not before launch |

## 5. Checks on every phase

- `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` green in the admin repo; the user repo's checks green for any migration PR.
- **Security review skill** on every pull request diff (admin rule); Critical and High fixed before merge, findings named in the PR.
- **Playwright smoke**: every route × the 5 roles (Admin, Finance, Support, Sales, Viewer) on `localhost:3001` against staging, plus 375 px wide with no sideways scroll.
- **Gate check**: a build without `NEXT_PUBLIC_ADMIN_V2` shows the old admin exactly.
- **Money**: only Razorpay test mode; after each money step the nightly money check still balances on staging.
- Text checks first; screenshots only where layout matters.
- Test logins and the test authenticator secret live only in `.env.all-secrets` (names only in code and docs).

## 6. Promote to production (you run this later)

1. Every phase you want is built, checked on staging, and you have looked at it.
2. The database functions from P1-P4 reach production through **"Release to production"** (decision 57). Check the release run is green.
3. Production readiness: `dev_otp_for_all` off, live Razorpay keys set only on production, MFA on for every staff account.
4. Set `NEXT_PUBLIC_ADMIN_V2=on` on the production admin project and change its `environment` gate rule to allow production (Claude does this on your "promote the admin design").
5. Rebuild production admin. Sign in, open Today, Inbox, Money, one person, one task. No money action on real people during the check.
6. Keep the old pages for 7 quiet days, then a small PR removes the old shell and the gate.
7. If anything is wrong: unset the setting and rebuild; the old admin is back.

## 7. Risks

- **Production rebuilt from the same branch**: covered by the two-lock gate.
- **Function changes breaking the old admin on staging**: new options only with safe defaults; old calls tested in each migration PR.
- **Free plan limits** (Vercel Hobby, Inngest Hobby): no new scheduled jobs in this plan; health reads only.
- **Cloudflare move on money day**: the gate setting moves with the admin to its Worker; add it to the move checklist.

## 8. Rough size

P1 is the biggest (about 17 steps, several PRs). P2 about 10, P3 about 6, P4 about 8. Each phase ends with something you can open on staging.

## 9. Owner decisions

| # | Decision | Recommendation |
|---|---|---|
| 1 | Approve the 8-section layout with one Inbox | **Yes** |
| 2 | Disputes and refunds: a typed word every time + the authenticator code once per 10 minutes | **Yes** |
| 3 | Which "New" items first | **Content editor first** (walkthrough YouTube link + banner), **then launch areas**; coupons and Loops email after launch |
| 4 | Support sees money read-only | **Yes** |
| 5 | Dark sidebar stays dark green in dark mode | **Yes** |
| 6 | Build order P1 → P5 as above | **Yes** |
| 7 | Production gate: the new admin shows only on staging (two locks: build setting on staging only + `environment` must read exactly `staging`) until you say "promote the admin design" | **Yes** (the alternatives, a separate branch or building everything before merging, break the one-branch rule or make huge risky PRs) |

Say **"build the admin design"** (with any changes to the decisions) to start P1.
