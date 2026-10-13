# TaskDrop Ops Console: master build prompt

Paste everything below the line into a fresh Claude Code session opened in this repo (`taskdrop-admin`). It is written from the founder/CEO's seat and is the brief for turning the admin panel into the single place TaskDrop is run from, live.

Written 2026-10-13 from a read of `redesigned-2.0` in both repos (admin `d32503f`, app `153733f`) and the upgrade plan (`docs/UPGRADE_PLAN.md` in the app repo).

---

## 0. Who you are and what this is

You are the founding engineer and system architect for TaskDrop, working for me, the founder and CEO. I'm not a developer. I run the company from this panel, so it has to be something I can operate alone, at 2 a.m., on a laptop or my phone, without reading code or SQL.

**TaskDrop** is a two-sided task marketplace in India. A poster asks for something ("Ask for anything. Someone gets it done for you."), nearby or remote workers quote, the poster picks one and pays, and the money sits in escrow until the work is approved. Tasks can be local or remote. Money is in ₹, stored in paise, and must be paise-accurate everywhere. We earn a commission (currently `worker_commission_pct` = 10% from the worker side), a poster service fee, cancellation fines, and paid promotions/ads.

**The job:** turn this admin panel into the **TaskDrop Ops Console**, a real-time command centre from which I can see and control every part of the live app: people, tasks, money, trust and safety, growth, app behaviour and system health.

### Repos, branches, environments (hard rules)

- **This repo:** `hitendureacts77/taskdrop-admin`. Next.js 16 (App Router, server actions), React 19, `@supabase/ssr`, Zod, TypeScript.
- **App repo:** `hitendureacts77/taskdrop`. Expo / React Native (web, Android, iOS), Supabase (Postgres + RLS, Edge Functions: `api`, `razorpay`, `razorpayx-payouts`, the two webhooks, `phone-auth`, `password-auth`, `places-search`). **All database migrations live there**, in `supabase/migrations/`, numbered after `089_staff_roles`.
- **Branches:**
  - All work targets **`redesigned-2.0`**, in both repos.
  - **Never commit to, merge into, or deploy `main`.** `main` is the live app my testers use. I promote to `main` myself, by hand, after testing.
  - For each piece of work, cut a short branch from `redesigned-2.0` (e.g. `admin/live-ops`) and open a pull request **into `redesigned-2.0`**.
  - A PR merges only after CI (typecheck, build, tests) is green and CodeRabbit has reviewed it.
  - Vercel builds a **preview** for every push to `redesigned-2.0`. Test there. Production stays on `main`.
- **Shared database until the switch-over (upgrade plan, ground rule 4):**
  - The old admin, the old app and `redesigned-2.0` all use Supabase project `wjxvingpfbfvkfqhrguj`. Migrations are **additive only**: new tables, columns and functions. Never drop, rename or change the meaning of anything the old app or old admin uses.
  - Existing `api` operations keep their inputs and outputs. New behaviour goes in new operations or optional fields.
  - Write every migration so it runs safely twice (`if not exists`, `create or replace`).
- **Stage:** testing only. Fake data, me and about 10 testers, no customers. Build as if real money and real people were on it anyway.

Before writing code, read in this order: this repo's `README.md`; `src/lib/actions.ts`, `src/lib/data.ts`, `src/lib/staff-roles.ts` and `src/lib/mfa.ts`; then, in the app repo, `AGENTS.md`, `docs/UPGRADE_PLAN.md` (Phases 3, 5 and 7 hold the admin to-dos) and `docs/RUNNING_THE_BUSINESS.md`.

---

## 1. How I rank every decision

When two goals pull against each other, the higher one wins:

1. **Money safety and trust.**
   - Nothing may move money wrongly, lose escrow, pay twice, or skip "confirm before it moves money".
   - Every money action goes through a server-side SQL function or Edge Function. The browser never computes amounts.
   - Every money action is idempotent and written to `admin_audit_log`.
2. **Real-time truth.** What I see is what is happening now. Numbers update by themselves; I never press refresh to learn that a dispute opened or a payout failed.
3. **Simple for a layman.** Plain words ("Send ₹450 back to Priya", not "Initiate refund txn"). Every screen answers *what's happening, what needs me, what can I do*. No jargon, no raw ids unless I click "details".
4. **Least privilege.** Staff roles (`admin`, `finance`, `support`, `viewer`) are enforced by the database (`private.staff_can`), not only the UI. Money and settings changes also need the authenticator (MFA) gate.
5. **Fast to learn from.** Ship the smallest useful version of each module, behind the existing panel, in small PRs.

---

## 2. What already exists (keep it, polish it, don't rebuild it)

The panel on `redesigned-2.0` already has these screens. They work; upgrade them to the new design and make them live, but keep their behaviour.

| Area | Screens and actions today |
|---|---|
| **Overview** | Dashboard: earnings today and total, escrow held, paid out, what's waiting, whose money is in the account |
| **Money** | Earnings & escrow (chart 7 days to all time), Earnings entries (ledger), Payouts (queue; check with RazorpayX; pay by hand via UPI QR; give back), Payout detail, Refunds ("Send refund" through Razorpay) |
| **Operations** | Jobs list and job page (money, timeline, quotes, reviews, dispute decision), People list and person page (wallet, jobs, withdrawals, ratings, contact), Disputes (decide), Help requests (reply, resolve), Copyright notices (log, take down, reject, counter-notice, restore), Promotions (list only) |
| **Customers** | Customer hub (CRM): notes with follow-ups, tags, suspend/unsuspend, delete account; Segments; Messages (broadcast to a segment); CSV export |
| **Admin** | Reports; Settings (`poster_service_fee_pct`, `post_start_cancel_penalty_pct`, `review_window_days`, `clearing_period_days`, `max_video_seconds`); Admin & configuration: Team and staff roles, Switches (`admin_require_mfa`, `dev_otp_for_all`), Integrations, System health, Audit log; Security (MFA); global Search |
| **Safety rails** | Google sign-in + `admin` role + allowlist; MFA for money; idle (30 min) and absolute (12 h) session timeouts; `ConfirmAction` for risky buttons |

**Known gaps in what exists:**
- **Nothing is real-time.** No screen subscribes to changes; counts and lists are as old as the page load.
- **Promotions is read-only.** You can't pause, cancel or refund a campaign there.
- **Jobs and people have no corrective actions beyond disputes and suspension.** No hide, no cancel-with-refund, no category change, no wallet adjustment with a reason.
- **Unused app data:** the panel never reads `feedback`, `referrals`, `ad_events`, `task_proofs`, `messages`, `cancellations_log`, `age_checks`, `auth_send_log`, `api_rate`, `places_quota`, `saved_tasks` or `private.automation_log`.
- **Hard-coded in the app:** the worker commission, promotion prices, categories, help text and home sections. I can't change any of them without a deploy.
- **`dev_otp_for_all` is ON** (since 2026-10-11): any phone number signs in with an auto-filled code, on the live app too. The console must make this impossible to miss.

---

## 3. What to build: the modules

Build these as modules in the sidebar. Each lists what I must be able to see, what I must be able to do, and the server work it needs. "New SQL" means a new, additive migration in the app repo plus an `admin_*` function that checks `private.staff_can`, writes `admin_audit_log`, and is `security definer` with a fixed `search_path`.

### 3.1 Live Ops: the home screen (real-time)

The first thing I see. It updates by itself.

- **Live strip:**
  - People online now: posters and workers, from `touchPresence`
  - Open tasks, tasks in progress, overdue tasks
  - Bids in the last hour
  - Escrow held right now
  - Today's earnings
  - Payouts waiting, refunds waiting, open disputes, open reports, open help requests (each counter is a link to its queue)
- **Live feed:** a stream of what's happening, newest first.
  - Events: new sign-up, task posted, first quote on a task, task assigned and paid, proof submitted, task completed, cancellation, dispute opened, withdrawal requested, payout paid or failed, refund sent, report filed, help request, copyright notice.
  - Each row says it in one sentence, in plain words, and clicks through to the record.
  - Filter by type. Pause the stream.
- **Live map:**
  - Open tasks (pins coloured by status and age) and online workers (pulsing presence dots), clustered.
  - Toggle a heat layer: demand (tasks) vs. supply (online workers) by area.
  - The whole point is liquidity: I need to see at a glance where tasks are waiting with no workers nearby.
  - Use the same map provider the app uses on web. Read `apps/mobile` in the app repo before choosing; don't add a new paid key.
- **Needs you now:** one ranked list of everything waiting on a human, oldest first, each with an age and an SLA colour.
  - Targets: payouts and refunds within 24 h; disputes within 48 h; reports within 24 h (the app store requires this); help requests within 24 h.
  - One click to act.
- **Alerts:**
  - A sound and a browser notification (opt-in per staff member) for: a payout failed, a refund sent but not recorded, a new dispute, a new report, and money checks that don't add up (ledger vs. escrow vs. RazorpayX balance).
  - Respect `admin_staff.notify`.

### 3.2 Tasks (control every job)

- **List:** filter by status (`OPEN`, `LOCKED`, `TASK_STARTED`, `OVERDUE`, `WORK_DONE`, `REVISION_REQUESTED`, `COMPLETED`, `AUTO_COMPLETED`, `CANCELLED`, `DISPUTED`), kind (local/remote), category, city/area, date, value, promoted, has dispute, has report. Live updates.
- **Task page (one screen tells the whole story):**
  - Timeline from post to payout
  - Every quote
  - The chosen worker
  - The escrow position (paid, held, released, refunded, fines)
  - Proof of work: photos/video from `task_proofs`, viewed through signed URLs
  - The chat between poster and worker. Read-only, and opening it asks for a reason, which goes to the audit log.
  - Reviews, the cancellation record, the dispute
- **Actions (new SQL, all audited, money ones behind MFA):**
  - Hide/unhide the listing, with a reason the poster sees
  - Change the category
  - Extend the due date
  - Cancel with full or partial refund. Show exactly who gets what in ₹ before I confirm.
  - Release escrow to the worker (approve on the poster's behalf, only when the work is proven)
  - Re-open to quotes
  - Mark overdue
  - Message the poster and/or worker (in-app + push)
- **Overdue and stuck:** a view of tasks past `due_at`, tasks paid but not started, work done but not approved, and auto-release coming up. Each has a suggested action.

### 3.3 People (every account, complete picture)

- **Person page:**
  - Identity: name, username, phone/email, age check (`age_checks`), roles, worker profile, listings
  - Devices, platform and app version (from `push_tokens` and the platform headers once Phase 3 adds them)
  - Sign-in history and OTP sends (`auth_send_log`); rate-limit hits (`api_rate`)
  - Wallet and every movement
  - Payout destinations, masked; full details only for Finance, with a reason
  - Tasks posted and worked, quotes, reviews given and received, reports by and against, blocks, referrals, feedback, CRM notes and tags
- **Actions (all audited):**
  - Suspend / unsuspend (exists)
  - Warn (in-app message with a template)
  - Reset or flag a review
  - Remove a listing
  - Verify a worker (badge)
  - Force sign-out everywhere
  - Delete account (exists)
  - Wallet adjustment (new SQL, via `wallet_adjustments`):
    - needs a reason, Finance role and MFA
    - above a threshold I set in settings, needs a **second staff member to approve** (four-eyes)
- **"See as this user":** a read-only preview of what their Home, My Tasks and Wallet show. It is built from server reads, never by signing in as them.
- **Risk signals** (computed in SQL, shown as plain-English flags with the evidence):
  - one device or UPI destination shared across accounts
  - poster and worker who only ever trade with each other
  - unusually high cancellation or dispute rate
  - many OTP requests
  - a new account withdrawing quickly

### 3.4 Money (the finance desk)

Keep everything in the Money section, and add:

- **Daily close:** one screen that reconciles, for a chosen day:
  - Razorpay collections vs. tasks funded
  - escrow held vs. the ledger
  - commission earned vs. `platform_ledger`
  - RazorpayX payouts vs. withdrawals
  - refunds sent vs. recorded

  Every line is green or red, with the rupee difference and a link to the rows that cause it.
- **Payouts:** add the Phase 5 states: queued, sending, retrying, paid, failed, given back. Bulk "check all with RazorpayX". Per-payout timeline including webhook events.
- **Webhooks:** a log of Razorpay and RazorpayX webhook events (the Phase 5 `webhook_events` table): received, verified, processed, failed. "Retry processing" for failed ones.
- **Commission and tax report:** commission and fees by day and month. Export to CSV for my accountant. Don't hard-code a GST rate; read it from settings, and if it isn't set, show "not set".
- **Wallet adjustments ledger:** every manual credit or debit, who made it, who approved it, and why.

### 3.5 Trust & safety

- **Reports queue** (Phase 7: new `reports` and `blocks` tables):
  - Reports on tasks, messages, reviews and people, with the reported content shown inline.
  - Actions: remove, hide, warn, suspend, delete; or dismiss with a note.
  - SLA timer: 24 h.
- **Content moderation:**
  - Hide a message or photo (`media.status = hidden`); remove a review.
  - Hidden content disappears for everyone, in real time.
- **Disputes** (upgrade the existing page):
  - Evidence side by side: chat, proofs, timeline, both parties' statements, `listDisputeReasons`.
  - Decision buttons show the exact ₹ split before confirming (`admin_resolve_dispute`).
  - Both sides are notified.
- **Copyright:** keep as is (DMCA flow from migration 085).
- **Blocks:** see who blocked whom; lift a block only with a reason.

### 3.6 Growth and engagement

- **Promotions and ads:**
  - Every campaign with budget, spend, impressions and clicks (`ad_events`), and its ranking position.
  - Actions: pause, resume, cancel with refund of the unspent budget (new SQL, reusing the 046 refund logic).
  - **Price tiers editable** in settings (Phase 7).
- **Broadcasts** (upgrade CRM Messages):
  - Target by segment, platform (web / Android / iOS), app version, city, role.
  - Channel: in-app, push, or both. Schedule for later. Preview on a phone frame. A test send to myself first.
  - Delivery stats: sent, delivered, opened, where push receipts allow.
- **Referrals:** who referred whom, conversions, any rewards owed.
- **Feedback inbox:** everything sent through `sendFeedback`, taggable, with a link to a help request or a roadmap note.

### 3.7 App controls (Phase 3: control the app without a deploy)

This needs a new `app_controls` table and a public, cached `app-config` Edge Function in the app repo. The `api` function enforces every switch, using the `x-taskdrop-platform` and `x-taskdrop-app-version` headers. Requests without headers count as "old app".

- **Switches, each per platform (web / Android / iOS / old app):**
  - maintenance mode with a message
  - minimum app version (forces "Update the app")
  - new sign-ups; each sign-in method
  - posting, bidding, top-ups, withdrawals, promotions, chat photos
  - "require verified phone"
- **Announcement banner:** text, link, platforms, start and end time; preview.
- **Dangerous switches:** `dev_otp_for_all` sits in a red "Testing only" box. It stays visible on Live Ops as a banner while it's on, and needs typing `TURN ON` plus MFA.
- Every change is audited, takes effect within about 60 seconds, and shows "live on N devices" once the app has picked it up.

### 3.8 Pricing and rules

One settings screen, grouped and explained in plain words, behind the Admin role and MFA:

- **Settings:**
  - `worker_commission_pct`, `poster_service_fee_pct`, `post_start_cancel_penalty_pct`
  - `review_window_days`, `clearing_period_days`
  - promotion price tiers, `max_video_seconds`
  - the four-eyes threshold
  - rate limits and quotas: `places_quota`, API reads per minute
- **For every change:**
  - Show the impact before saving. Example: "From the next task: a ₹1,000 task pays the worker ₹900 instead of ₹880." Compute it with the same server function the app uses (`platformFees`).
  - Set an **effective-from** time and keep a history.
  - Changes never apply to tasks already funded.

### 3.9 Catalogue and content

Move hard-coded content into tables the app reads through `app-config`, with versioning:

- categories (name, icon, local/remote, active, order)
- help/FAQ articles
- the home-screen sections and their order (the app's Home order must match what's configured)
- legal pages (Terms, Privacy, with version and effective date)
- notification and email/SMS templates

Edit with a live preview. Publishing a new version is audited and can be rolled back.

### 3.10 Insights (decisions, not vanity)

Computed from real data only. Never show a made-up number. If something can't be computed yet, the card says "No data yet".

- **Marketplace health:**
  - time to first quote
  - % of tasks that get a quote in 1 hour and in 24 hours
  - fill rate (posted → assigned)
  - completion rate, cancellation rate, dispute rate, refund rate
- **Liquidity by area:** open tasks vs. online workers, and unfilled tasks, on the map and as a table.
- **Money:**
  - GMV, net revenue, take rate (net revenue ÷ GMV)
  - average task value, commission by category, promotion revenue
  - payout and gateway fees, where recorded
- **People:**
  - sign-ups, activation (first post / first quote), retention cohorts by week
  - worker earnings distribution
  - users by platform and app version
- **Funnel:** sign-up → first post → first quote received → paid → completed → second post.
- Every chart covers 7 days to all time, with a comparison period and CSV export. Use the existing `admin_earnings_daily`-style daily rollups so all-time stays fast.

### 3.11 System health

- **Status of each dependency:**
  - Supabase (latency)
  - every Edge Function (last success, error rate)
  - Inngest jobs (Phase 5: last run, failures, retries)
  - pg_cron jobs, the outbox backlog
  - push delivery and dead tokens
  - SMS/OTP sends per hour, with cost if known
  - `places-search` quota, API rate-limit hits
- **Links out:** Sentry, Inngest, Vercel, Supabase, ImageKit, Uptime Robot.
- **Launch-readiness checklist:** red items that must be fixed before customers, e.g. `dev_otp_for_all` on, RazorpayX in test mode, missing legal env vars, DMCA agent not registered.

### 3.12 Team, security and audit

- Keep staff roles. Add per-role page visibility: Support never sees full bank details; Viewer sees everything and changes nothing.
- **Audit log:**
  - searchable by person, staff member, action, record and date
  - exportable
  - every row shows before/after values
  - append-only: no update or delete, enforced in SQL
- Sessions: list my active sessions, sign out others. MFA status for every staff member; MFA required for Admin and Finance.
- Gateway: send the `x-taskdrop-gateway` header from the server client, with `API_GATEWAY_SECRET` (Phase 3), so the console keeps working after the Phase 9 lockdown.

### 3.13 Everywhere

- **⌘K command bar:** find any person, task, payout or ticket by name, phone, username, ₹ amount or id, and jump to actions ("refund task …", "suspend …").
- **Works on my phone:** every queue and every confirm button works at 375 px wide.
- **Every list:** saved filters, CSV export, pagination that doesn't break live updates.

---

## 4. Real-time architecture (how to make it live without breaking anything)

1. **One admin event stream:**
   - Add `public.admin_live_events`: id, type, record_type, record_id, actor_id, summary jsonb, created_at.
   - Fill it from triggers on the source tables. Even better: from the Phase 5 `private.outbox`, so one event feeds Inngest, alerts and the console.
   - RLS: only `is_admin()` may select; nobody may insert directly.
   - Add it to the `supabase_realtime` publication. Prune after 30 days with pg_cron.
2. **The browser subscribes:**
   - Use Supabase Realtime `postgres_changes` on `admin_live_events` from a client component. It must be signed in with the staff member's session, never the service key.
   - On each event: update counters and lists in place and call `router.refresh()` only for the affected route segment. Don't reload whole pages.
3. **Presence:**
   - Workers online comes from the app's existing `touchPresence` op. Read it through a server function that returns aggregates (counts per area, approximate positions).
   - Never expose exact home locations: `private_locations` (074) stays private. The map shows task areas and coarse worker positions only.
4. **Counters stay correct:**
   - Every counter has a server read (truth) plus live increments (speed).
   - Re-sync from the server every 60 seconds and on tab focus, so a missed event can't leave a wrong number.
5. **Money screens never trust the stream for amounts.** The stream says "something changed"; the screen re-reads the amount from the server.
6. **Graceful when offline:** a small "Live / Reconnecting…" indicator. Queues still work by page load if Realtime is down.

---

## 5. Look and feel

- **Brand (from `Taskdrop version 2.0 redesign`):**
  - Plus Jakarta Sans, with tabular figures for money
  - Colours:
    - jade `#0E8F72` / deep `#0A6F58` for money and primary actions
    - royal blue `#2F5BEA` for earning/worker data
    - gold `#E0A85A` for verified
    - coral `#E0724A` for warnings
  - The drop-and-check logo with lowercase `taskdrop.`; never a map pin as the logo
  - Light and dark themes; dark is first-class
- **Feel:** a consumer-grade ops tool (think Uber/Rapido ops, Meta Business Suite), not a database browser.
  - Cards with radius 16–20 and hairline borders
  - Status chips with an icon + word, never colour alone
  - Skeleton loaders
  - Friendly empty states ("No disputes. Nice.")
  - Subtle motion that respects Reduce Motion
- **Words:** sentence case. ₹ with Indian digit grouping (₹1,23,456.00). Relative times with the exact time on hover. Plain verbs on buttons.
- **Confirmations:** any button that moves money, deletes, suspends or changes a setting opens a confirm sheet. The sheet says exactly what will happen, to whom and for how much. MFA where required.
- **Accessibility:** keyboard reachable, visible focus, 4.5:1 contrast, labels on every icon button.

---

## 6. Non-negotiables (CodeRabbit and I will check these)

- **Server-side only:**
  - No amount is computed in the browser.
  - The service-role key is used only on the server and only where RLS can't serve the read.
  - Every write goes through an `admin_*` SQL function or an Edge Function that checks the staff role itself.
- **Records:**
  - Every admin write is in `admin_audit_log` with before/after.
  - Money actions are idempotent (an idempotency key on every refund, payout, adjustment and release).
- **Privacy:** reading private chats, full phone numbers or bank details needs a reason, and that read is logged too.
- **Compatibility:** additive migrations only. The old admin (`main`) and the old app must keep working on the shared database. A CI check flags any drop or rename.
- **Types:** regenerate `src/lib/db/database.types.ts` after each migration (`npm run db:types`). No `as unknown as SupabaseClient` casts for new tables once types exist.
- **Tests:**
  - Unit tests for every money formula and permission rule.
  - SQL tests (in the app repo's suite) for every new `admin_*` function: allowed role, denied role, audit row written, idempotent on retry.
  - A Playwright smoke test per module against the Vercel preview.

---

## 7. Delivery plan (small PRs into `redesigned-2.0`)

Do these in order. Each is one branch from `redesigned-2.0`, one PR into `redesigned-2.0` per repo touched (app repo for SQL, this repo for UI), CI green, CodeRabbit reviewed, and tested on the Vercel preview before the next starts.

| # | PR | Why first |
|---|---|---|
| 1 | **Live foundation**: `admin_live_events`, triggers, Realtime subscription, live counters on the Dashboard and sidebar badges, the Live / Reconnecting indicator | Everything else hangs off it |
| 2 | **Needs you now + alerts**: unified queue with SLA timers, sound and browser notifications | Nothing urgent gets missed |
| 3 | **Task actions**: hide, category, extend, cancel with refund, release, re-open; task page with proofs and chat (with reason) | Most common fixes today need SQL |
| 4 | **Money desk**: daily close, wallet adjustments with four-eyes, Phase 5 payout states, webhook log | Money safety |
| 5 | **App controls** (Phase 3) + `dev_otp_for_all` guard rail | Control without deploys |
| 6 | **Pricing and rules** with impact preview and effective-from | Commission and promotion tiers out of code |
| 7 | **Trust & safety** (Phase 7): reports, blocks, moderation, dispute evidence view | App store requirement before launch |
| 8 | **Live map and liquidity** | Where to recruit workers |
| 9 | **Growth**: promotions actions, broadcasts by platform/version, referrals, feedback | Engagement |
| 10 | **Catalogue and content**: categories, help, home sections, legal, templates | Change the app without a release |
| 11 | **Insights** | Decide with data |
| 12 | **System health + launch checklist**, audit log upgrades, ⌘K | Run it calmly |

Update `README.md` (the screens table) and the app repo's `docs/UPGRADE_PLAN.md` checkboxes in the same PR that delivers each item.

---

## 8. Definition of done (per module)

- [ ] Works on the Vercel preview of `redesigned-2.0` against the shared test project, signed in as each staff role: allowed actions work, denied ones explain why.
- [ ] Two browser windows open: an action in one, or in the app, appears in the other within 2 seconds without a refresh.
- [ ] Every write appears in the audit log with before/after.
- [ ] Money actions show the exact ₹ effect before confirming, are idempotent when clicked twice, and need MFA.
- [ ] Usable at 375 px wide, in light and dark.
- [ ] The old admin on `main` and the old app still work.
- [ ] Typecheck, build, unit and SQL tests pass; CodeRabbit comments resolved.

---

## 9. Out of scope (don't build)

- Changing `main` or production deployments.
- Merging the admin into the app repo (decision E in the upgrade plan: the admin stays in its own repo).
- Any feature that pays a worker from company money or bypasses escrow.
- AI auto-decisions on disputes, refunds or suspensions. AI may *summarise* evidence later; a human always decides.

---

## 10. Before you start

Read the files listed in section 0. Then reply with:

1. Anything in this brief that conflicts with the code or the upgrade plan.
2. The exact migrations and admin functions PR 1 needs.
3. Any decision you need from me.

Then wait for me to say "start PR 1".
