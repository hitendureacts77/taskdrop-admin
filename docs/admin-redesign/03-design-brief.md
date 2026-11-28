# Admin panel redesign: design brief (28 Nov 2026)

Status: **design only**. Nothing here is built. The clickable design is `design/admin-design.html` (open it in a browser).
Inputs: `01-current-admin-inventory.md` (today's 37 pages) and `02-user-app-features-inventory.md` (what the user app now does).

---

## 1. The prompt (use this to build or extend any screen)

> Design one screen of the TaskDrop admin panel. The user is the owner: not technical, running a local-tasks marketplace in India alone with a few staff, often on his phone. He must be able to manage everything **safely** and **easily**.
> - Lead with the one thing he must decide or know on this screen. One primary action per card.
> - Plain English. No table names, no JSON, no error codes, no "run migration X". Say what happens to real people ("Ravi gets ₹1,200 in his bank in 1-2 days").
> - Colours mean one thing each: jade = Hire / poster / our earnings, royal blue = Earn / worker, gold = money waiting or held, orange = a problem, red = launch blocker or danger. Status is always a dot plus a word.
> - Every money, delete, ban or switch action uses the confirm tier from section 6. Never skip it.
> - Respect the role switcher (section 5): hide what the role cannot see, lock (with a reason) what it can see but not change.
> - Respect "Hide test data" (on by default): `fa4e0001-*` people and their tasks vanish from lists and from every number.
> - Staging always shows the gold ribbon. Production never does and shows a small "Production" badge.
> - Works at 375 px wide with no sideways scrolling; tables become stacked cards.
> - Anything not built yet is shown with a dashed "New - needs building" card, never as if it works.

## 2. Goals
1. **One place for work waiting on him** (Inbox) instead of five overlapping queues.
2. **8 top sections instead of 25 items + 9 tabs.** Every old page has a home (section 4).
3. **Cover everything the app shipped in November**: Plan B holds and the move queue, chat window, counter-offers, skills catalog, City Hunt, guest mode, earn goal, places quota, SMS caps, cron and Inngest health.
4. **Safer by design**: three confirm tiers, MFA on money and settings, extra friction on risky switches, plain-sentence audit log.
5. **Calm and readable** in light and dark, on desktop and phone.

## 3. Owner's top 10 daily jobs (in order)
1. Open **Today**: is anything on fire? (problems count, money held, launch blockers)
2. Clear the **Inbox**: disputes, failed money moves, refund and help requests, oldest first against the 24 h / 48 h promise.
3. **Decide a dispute** on the task page: read evidence, release / refund / split.
4. **Retry a failed release or refund** in Money > Holds & moves.
5. **Answer help requests** in Support.
6. **Look up a person or task** by name, phone or id from the top search.
7. **Act on a person**: warn, suspend, sign out everywhere, delete on request.
8. **Review flagged content**: reports, task text and video checks, new skills, City Hunt photos.
9. **Check the money matches** (nightly money check) and the system health line.
10. **Change a switch or setting** (rare, high risk): fees, sign-in methods, maintenance, banner.

## 4. Information architecture (8 sections)

| # | Section | Holds | Hidden from |
|---|---|---|---|
| 1 | **Today** | Big numbers, launch blockers, top of Inbox, live feed, health line | - (Sales gets a sales version) |
| 2 | **Inbox** | Everything waiting on a human, one list, filter chips by type | items filtered per role |
| 3 | **Money** | Overview · Holds & moves · Payouts (old wallet) · Refunds · Money check · Fees & money switches | Sales |
| 4 | **People & tasks** | People list + person page · Tasks list + task page (disputes live here) · Devices & app versions | - |
| 5 | **Safety** | Reports · Text & video checks · Skills catalog · City Hunt photos · Copyright | - |
| 6 | **Support** | Help requests (tickets) · Feedback board | - |
| 7 | **Growth** | Segments · Broadcast · Leads & follow-ups · Promotions · Reports & numbers | Finance (locked) |
| 8 | **Settings** | App switches · Content · Team & access · System health · Audit log · Launch checklist · My security | most items Admin-only (locked) |

### Old page → new place

| Old page | New place |
|---|---|
| `/` Dashboard (incl. Sales dashboard) | Today (Sales version kept) |
| `/needs-you` | Inbox |
| `/alerts`, alerts toggle, "Things to do", badges | Inbox (System filter) + one badge on Inbox only |
| `/money` | Money > Overview |
| `/money/entries` | Money > Overview > "All money entries" link (ledger view) |
| `/payouts`, `/payouts/[id]` | Money > Payouts (old wallet), detail drawer with UPI QR |
| `/refunds` | Money > Refunds |
| `/money/reconcile` | Money > Money check |
| `/settings` Money and timing | Money > Fees & switches (fees, waiting days) + Settings > App switches > Limits (budgets) |
| `/tasks`, `/tasks/[id]` | People & tasks > Tasks, task page |
| `/disputes` | Tasks list filter "Disputes" + Inbox; decision on task page |
| `/users`, `/users/[id]` | People & tasks > People, person page |
| `/devices` | People & tasks > Devices & versions |
| `/reports-queue` "Reports" | Safety > Reports (renamed "Reported content") |
| `/support`, `/support/[id]` | Support > Help requests |
| `/copyright` | Safety > Copyright |
| `/feedback` | Support > Feedback board |
| `/promotions` | Growth > Promotions |
| `/crm` hub | Growth (section landing) |
| `/crm/tasks` | Growth > Leads & follow-ups (Follow-ups tab) |
| `/crm/leads` | Growth > Leads & follow-ups |
| `/crm/segments` | Growth > Segments |
| `/crm/messages` | Growth > Broadcast |
| `/reports` | Growth > Reports & numbers |
| `/team/performance` | Growth > Reports & numbers > Staff tab |
| `/search` | Top-bar search (people, tasks, payments, tickets) + "See all results" page |
| `/settings/team` | Settings > Team & access |
| `/settings/switches` | Settings > App switches > Launch blockers + Admin security |
| `/settings/rules` (CRM automation) | Growth > Leads & follow-ups > "Automatic follow-ups" |
| `/settings/controls` "Web, Android & iOS" | Settings > App switches > Sign-in, Marketplace, App updates |
| `/settings/integrations` | Settings > System health > Connected services |
| `/settings/health` | Settings > System health |
| `/settings/audit` | Settings > Audit log (plain sentences) |
| `/security` (own MFA) | Settings > My security (also from the avatar menu) |

## 5. Roles (live in the design via the role switcher)

| Role | Sees | Can change |
|---|---|---|
| Admin | Everything | Everything (money + settings with MFA) |
| Finance | Money, People & tasks, Inbox (money + disputes), Reports, Health, Audit | Payouts, refunds, holds, disputes |
| Support | All but Settings internals; Money read-only | Help, CRM, warn/suspend, copyright, reports |
| Sales | Today (sales), Inbox (help + leads), People, Support, Growth | Help, CRM; no money, no settings |
| Viewer | Everything except Team | Nothing (all buttons locked with "View only") |

Rules kept: at least one Admin; nobody changes their own role; role change needs MFA.

## 6. Safety rules (confirm tiers)

| Tier | Used for | What the owner sees |
|---|---|---|
| **1. Tap** | Reversible, low impact: add tag, assign ticket, mark read, snooze | Instant, toast with **Undo** (10 s) |
| **2. Confirm** | Affects one person, reversible by staff: warn, hide content, suspend, resolve report, normal switch (posting, bidding, chat photos), broadcast | Modal: what happens, who is affected, environment line, Cancel / one clear verb button |
| **3. Type + MFA** | Money moves, fee changes, delete account, ban, risky switches (`dev_otp_for_all`, `money_paused`, `money_flow`, `money_provider`, signups, maintenance), role changes | Modal: plain consequences, before → after, type a word (e.g. `PAUSE`, the person's first name, the amount), 6-digit authenticator code, button stays disabled until both are right |

Extra rules:
- The environment line is in every tier 2-3 modal: "You are on STAGING (test copy)" in gold or "PRODUCTION - real people and real money" in red.
- Risky switches carry an **Extra check** tag and a "What happens" sentence for both ON and OFF.
- `dev_otp_for_all` ON is shown as a red **launch blocker** on Today, App switches and Launch checklist.
- Money actions on a task in dispute require the decision flow, not a raw "release" button.
- Viewing a private address, phone number or chat writes an audit line; the button says "(recorded)".
- Bulk actions never exceed what the confirm shows ("Send to 1,284 people" - test people excluded and shown separately).

## 7. Per-screen spec

| Screen | Purpose | Contents | Main actions (tier) | Roles |
|---|---|---|---|---|
| Today | Is anything on fire? | Launch blocker bar; 4 big numbers (posted today, money held, released today, problems); top 3 Inbox items; Hire vs Earn today; live feed; health line | Open Inbox (nav) | All; Sales gets leads/follow-ups version |
| Inbox | Clear waiting work | Filter chips (All, Money, Disputes, Help, Copyright, Safety, System); each row: type, who, waited vs promise bar, one primary action; snooze; assign; done list | Open (nav), Assign to me (1), Snooze (1), Retry move (3) | Filtered per role |
| Money > Overview | Where is the money | Held now, waiting to release, earnings this month, failed moves; mode card (Pay per task / Razorpay test); 14-day earnings; money running / paused | Pause all money (3) | Admin, Finance; Support/Viewer read |
| Money > Holds & moves | Make sure every release/refund lands | Move queue (release / refund, status, try n of 5, next try); expired unpaid tasks; payment events log | Retry (3), Open task | Admin, Finance |
| Money > Payouts | Old wallet balances | Queue, check with RazorpayX, mark paid with UTR, give back to wallet, UPI QR drawer | Mark paid (3), Give back (3) | Admin, Finance |
| Money > Refunds | Send and track refunds | Refund list + "Send a refund" form | Send refund (3) | Admin, Finance |
| Money > Money check | Do our books match Razorpay | Nightly run results, mismatches explained in words | Run now (2), Mark explained (2) | Admin, Finance |
| Money > Fees & switches | Price and money mode | Commission, poster fee, cancel fine, clearing days, unpaid hours, min top-up; money flow / provider / pause | Edit (3), switch (3) | Admin only change |
| Tasks list | Find any task | Search, filters (status incl. Disputes, area, kind, overdue), test toggle respected | Row → task page | All |
| Task page | Decide disputes, fix a task | Header + status; dispute card with both sides; evidence tabs (Timeline, Chat excerpt, Proof photos, Offers); decision (release / refund / split + reason + note); money card; people; other actions | Decide (3), Cancel with refund (3), Force complete (3), Waive fine (3), Hide task (2), Change category (1), Show address (recorded, 2) | Decide: Admin, Finance |
| People list | Find anyone | Search by name/phone/id, filters (Hire, Earn, suspended, new accounts, test), CSV export | Row → person | All |
| Person page | Everything about one person | Profile, Hire/Earn stats, money (held, paid, payee status), tasks, devices, safety history, notes & follow-ups, history | Message (2), Warn (2), Suspend until (2), Ban (3), Sign out everywhere (2), Delete account (3, shows blockers), Rename / clear photo (2), Reset age check (2), Clear self-dealing flag (2), Raise limits (2), Unlock phone (2) | Ban/Delete: Admin |
| Devices & versions | Who runs which app version | Versions by platform, share below min version | Edit min version (3, in Settings) | All |
| Safety | Keep content clean | Tabs: Reported content (incl. reviews), Text & video checks, Skills catalog (merge, rename, hide), City Hunt photos, Copyright (notice → takedown → counter → restore) | Hide (2), Warn (2), Approve (1), Merge (2), Takedown (2) | Admin, Support, Sales |
| Support | Answer people | Ticket list + conversation + reply, assign, resolve; Feedback board (status, reply, hide, merge = New) | Reply (2), Resolve (1), Assign (1) | Admin, Support, Sales |
| Growth | Grow and keep people | Segments; Broadcast (segment → exact count → confirm); Leads & follow-ups + automatic follow-ups; Promotions (ROI, pause); New: Coupons, Email sequences | Send broadcast (2 with typed count), Pause promotion (2) | Admin, Support, Sales |
| Reports & numbers | How is the business | Funnel, retention, marketplace by area, earn-goal mix, guest → signup, staff performance, CSV; New: DataFast | Download CSV (1) | All except locked raw money for Sales |
| App switches | Turn app features on/off | Search; groups: Launch blockers, Money, Sign-in & sign-up, Marketplace, App updates, Limits, Admin security; dead keys hidden | Toggle (2 or 3) | Admin change; others locked |
| Content | What people see in the app | Banner (with preview), Highlights & trending; New: Home ideas, Big Days, explainers, walkthrough YouTube link, launch areas, legal versions | Publish banner (2) | Admin |
| Team & access | Staff and roles | Staff list, role, MFA on/off, last seen; role table | Add (3), Change role (3), End all staff sessions (3) | Admin |
| System health | Is the machine OK | Background jobs (last run, fails, run now, pause), Inngest usage vs limit, outbox, places quota, SMS caps, Sentry issues, App Check, connected services | Run now (2), Pause job (2) | Admin, Finance, Viewer |
| Audit log | Who changed what | Plain sentences, filters, expand for before/after table | - | Admin, Finance, Viewer |
| Launch checklist | Ready to go live? | Ready / not ready list with one fix link each | Links | Admin |

## 8. Design system
- **Font:** Plus Jakarta Sans (self-hosted in the build; Google Fonts only in the design file). Numbers use tabular figures.
- **Type scale:** 12 / 13 / 14 (body) / 16 / 20 / 28 / 40 (big numbers), weights 500/600/700/800.
- **Tokens (light):** bg `#f1f2f1`, surface `#fff`, sunk `#f7f7f6`, line `#e4e5e3`, ink `#16171a`, ink2 `#3f4240`, muted `#676b68`; jade `#0e8f72` / text `#0a6f58`; blue `#2f5bea`; gold `#e0a85a` / text `#7d5210`; orange `#e0724a` / text `#b0482a`; danger `#c0322b`; sidebar `#062b22`.
- **Tokens (dark):** bg `#0e1311`, surface `#161c1a`, line `#26302c`, ink `#eef1ef`, muted `#9aa5a0`; jade text `#4fcfa9`, blue text `#8ea9ff`, gold text `#f0c27f`, orange text `#ff9d78`, danger `#ff7b72`. Soft fills are 14-18% tints.
- **Radius** 14 px cards, 10 px controls, 999 px pills. **Spacing** 4-pt grid; cards 20 px padding (16 on phone).
- **Density:** comfortable by default; tables 48 px rows.
- **Components:** Shell (sidebar, top bar, ribbon), Big number tile, Card (one primary action), Pill (dot + word), Wait bar (time used vs promise), Table → stacked cards on phone, Tabs, Filter chips, Toggle row (name, what happens, tier tag), Confirm modal (3 tiers), Toast with Undo, Drawer, Empty / loading / not-set-up states, "New - needs building" card (dashed), Search dropdown.
- **Contrast:** all text 4.5:1 or better in both themes; jade/gold used as text only in their darker text tones.

## 9. Mobile behaviour
- Under 760 px: sidebar becomes a **bottom bar** (Today, Inbox, Money or People, People, More); More opens a drawer with the full map.
- Top bar shrinks to logo, search icon (full-width search sheet), Inbox badge, menu.
- Tables become stacked cards with labels; filters scroll inside their own row (not the page).
- Modals become bottom sheets; buttons are full width and at least 44 px tall.
- No sideways scroll at 375 px.

## 10. Empty, loading and error states
- **Loading:** grey skeleton blocks shaped like the content; never a spinner on a blank page.
- **Empty:** a short reason + what to do ("No disputes. Nice." / "No one matches. Clear filters").
- **Not set up:** when a table or function is missing on this server: "Not set up on this server yet. This part works once the update is installed. Nothing is broken." Never "run migration X". The technical detail goes to Sentry and the audit, not the screen.
- **Error:** "Couldn't load this. Try again" + a retry button; money errors also say "No money moved."

## 11. New backend pieces each screen needs

### High risk (money / security) - build with MFA, audit, owner review
| Piece | For | Note |
|---|---|---|
| `admin_plan_b_overview` + `admin_plan_b_retry_move` wired into UI | Holds & moves | RPC exists, UI missing |
| `admin_plan_b_moves` (list with filters, try count, next try) | Holds & moves, Inbox | new read RPC |
| `admin_money_webhook_events` (read) | Holds & moves log | new read RPC |
| `admin_set_setting` with tier + MFA check server-side, typed before/after audit | Fees, App switches | must refuse risky keys without fresh MFA |
| `admin_set_money_mode` (`money_flow`, `money_provider`) | Money switches | owner + MFA only |
| `admin_force_complete`, `admin_force_unassign`, `admin_waive_cancel_fine`, `admin_refund_topup` | Task page | money side effects |
| `admin_resolve_dispute` split amount support (check) | Dispute decision | verify split exists |
| `admin_ban_user`, `admin_suspend_until` | Person page | `user_roles` / `user_suspensions` |
| `admin_reveal_private` (address / phone / chat) writing audit | Task page, person page | privacy |
| `admin_unlock_phone`, `admin_raise_user_limit`, `admin_clear_self_dealing` | Person page | abuse controls |
| `admin_launch_readiness` (dev OTP, App Check, live keys, env, MFA) | Launch checklist, Today | read only |
| Coupons (table + RPCs) - **New** | Growth | money; owner decision |

### Normal
| Piece | For |
|---|---|
| `admin_inbox` (one union view over withdrawals, refunds, disputes, tickets, copyright, alarms, failed moves, alerts) with promise times + assign/snooze | Inbox, Today |
| `admin_search` (people, tasks, payments, tickets by id/phone/name) | Top search |
| `is_test` flag / `fa4e0001-*` filter param on every list + stats RPC | Hide test data |
| `admin_cron_jobs` (list, last run, fails) + `admin_cron_run_now` / `admin_cron_pause` | System health |
| `admin_usage` (Inngest executions, places quota, SMS caps, media) | System health |
| `admin_task_moderation_queue` + decide | Safety > Text & video |
| Skills catalog review queue UI (RPCs exist) | Safety > Skills |
| `admin_hunt_finds` queue + hide | Safety > City Hunt |
| `admin_feedback_merge` - **New** | Feedback board |
| Ticket assign to staff | Support |
| `admin_earn_goal_mix`, `admin_guest_funnel` | Reports |
| Audit sentence formatter (key → plain label map) | Audit log |
| Content CMS tables: home ideas/templates, Big Days, explainers, walkthrough link - **New** | Content |
| Launch areas (allowed areas + "coming soon" text) - **New** | Content |
| Legal versions (terms version + acceptance per user) - **New** | Content |
| Guest reads switch - **New** | App switches |
| Loops email sequences - **New** | Growth |
| DataFast analytics - **New** | Reports |
| Push test + dead-token cleanup | System health |
