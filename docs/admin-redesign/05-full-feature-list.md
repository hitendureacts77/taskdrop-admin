# Today's admin: full feature list vs the new design (28 Nov 2026)

Built from the code on branch `redesigned-2.0` (every page, view, component, server action, data read, API route and CSV export in `src/`). Each feature is checked against `docs/admin-redesign/design/admin-design.html`.

**How the design was judged (strict):**
- **Covered**: the design shows this feature. The design route is named, e.g. `#/money/payouts`.
- **Partly**: the design has something close but leaves part out. The missing part is named.
- **Missing**: the design does not show it at all.

**Roles:** Admin, Finance, Support, Sales, Viewer. "Not Sales" = Admin, Finance, Support and Viewer can see it (Sales has money and settings hidden). Who may *change* things: money area = Admin + Finance; people area = Admin + Support + Sales; admin area = Admin only; Viewer changes nothing (`src/lib/staff-roles.ts`).

**Confirm step:** none / two-step (`ConfirmAction`: first click explains, second click sends) / MFA (authenticator code, when `admin_require_mfa` is on, via `moneyMfaGate`).

## Totals

| Features found | Covered | Partly | Missing |
|---|---|---|---|
| **446** | **104** | **159** | **183** |

### By area

| Area | Features | Covered | Partly | Missing |
|---|---|---|---|---|
| Shell (every page) | 27 | 11 | 8 | 8 |
| Sign-in and access pages | 8 | 1 | 0 | 7 |
| `/` Dashboard (Admin, Finance, Support, Viewer) | 37 | 7 | 13 | 17 |
| `/` Dashboard, Sales variant | 6 | 1 | 3 | 2 |
| `/needs-you` Needs you now | 5 | 4 | 1 | 0 |
| `/money` Earnings & escrow | 15 | 1 | 7 | 7 |
| `/money/entries` Earnings entries (not in the sidebar) | 5 | 0 | 0 | 5 |
| `/money/reconcile` Money check | 6 | 2 | 2 | 2 |
| `/payouts` Payouts (withdrawals) | 21 | 2 | 3 | 16 |
| `/payouts/[id]` One withdrawal | 17 | 1 | 3 | 13 |
| `/refunds` Refunds | 7 | 2 | 3 | 2 |
| `/disputes` Disputes (read-only list) | 3 | 0 | 3 | 0 |
| `/support` Help requests | 3 | 0 | 2 | 1 |
| `/support/[id]` One help request | 5 | 4 | 1 | 0 |
| `/promotions` Promotions | 4 | 0 | 4 | 0 |
| `/reports` Business reports | 23 | 6 | 7 | 10 |
| `/search` Search | 3 | 3 | 0 | 0 |
| `/tasks` Jobs | 6 | 1 | 3 | 2 |
| `/tasks/[id]` One job | 21 | 8 | 8 | 5 |
| `/users` People | 11 | 1 | 5 | 5 |
| `/users/[id]` One person | 30 | 5 | 17 | 8 |
| `/devices` Devices | 4 | 2 | 2 | 0 |
| `/alerts` Alerts (team messages from background jobs) | 5 | 0 | 1 | 4 |
| `/reports-queue` Reports (flagged content) | 11 | 5 | 4 | 2 |
| `/copyright` Copyright notices | 16 | 4 | 6 | 6 |
| `/feedback` Feedback board | 10 | 2 | 5 | 3 |
| `/catalog` Skills & categories | 8 | 1 | 4 | 3 |
| `/crm` Customer hub | 12 | 0 | 5 | 7 |
| `/crm/tasks` Follow-ups & pipeline | 5 | 0 | 2 | 3 |
| `/crm/leads` Leads | 7 | 0 | 1 | 6 |
| `/crm/segments` Segments | 10 | 2 | 1 | 7 |
| `/crm/messages` Messages (broadcast) | 6 | 3 | 2 | 1 |
| `/team/performance` Team performance | 2 | 0 | 2 | 0 |
| `/settings/*` Admin & configuration (shared) | 1 | 1 | 0 | 0 |
| `/settings/team` Team & access | 12 | 5 | 3 | 4 |
| `/settings` Money & timing | 17 | 8 | 3 | 6 |
| `/settings/switches` App switches | 7 | 4 | 0 | 3 |
| `/settings/controls` Web, Android & iOS (kill switches) | 21 | 0 | 16 | 5 |
| `/settings/rules` Rules (CRM automation) | 7 | 2 | 1 | 4 |
| `/settings/integrations` Integrations (read-only) | 7 | 0 | 4 | 3 |
| `/settings/health` System health | 6 | 1 | 1 | 4 |
| `/settings/audit` Audit log | 5 | 2 | 2 | 1 |
| `/security` My security | 4 | 2 | 1 | 1 |

### Not counted: things the design adds that today's admin does not have

Inbox snooze and "Assigned to me", Holds & moves / retry failed releases, dispute "Split" with a slider, chat evidence tab, show full address (recorded), mark complete for them, waive cancel fine, remove helper, Text & video checks, City Hunt photos, skill "Approve", Content page and "Written into the app" cards, Launch checklist, money pause switch, money flow / provider switches, limits rows (area searches, uploads, feedback cap, smart search), idle sign-out setting, background job run/pause, Inngest / SMS / Places quotas, App Check card, hide test data toggle, dark mode, phone bottom bar, collapse menu, ban, unlock phone sign-in, raise limits, reset age check, rename user, remove photo and bio, coupons, email sequences, referral abuse, DataFast, guest funnel, "why helpers earn" donut, sign out my other devices, feedback "Merge". These are new work, not gaps.

## Missing in the design (183)

**Shell (every page)**

- F005 Sidebar footer "Staff only. Every money action asks you to confirm first."
- F006 "Skip to content" link for keyboard users
- F008 Live connection chip: Connecting / Live / Reconnecting / Live off
- F009 Alerts button: chime + desktop notification for withdrawals, failed payouts, disputes, help requests, copyright notices (per role); states "Turn on alerts", "Alerts on", "Alerts on · sound only", "Alerts off" (team setting, links to team page); choice remembered in this browser
- F015 Sign out button (ends the panel session) (design has no sign-out for yourself)
- F016 Browser tab title shows "(N)" waiting count
- F017 Live data re-read every 60 s and when the tab comes back into view (design is static; "updates by itself" only in copy)
- F027 Server-side per-staff rate limits on suspend, warn, delete account, broadcast ("too fast" message)

**Sign-in and access pages**

- F028 Sign-in page "Ops console", staff-only text (design has no sign-in screen)
- F029 Continue with Google
- F030 Sign in with @username and password
- F031 Sign-in error messages (wrong account, expired, idle sign-out reason)
- F032 Admin allowlist check (account must hold `admin` in user_roles / allowlist)
- F033 "Not an admin account" page: shows signed-in email, "Sign out and use another account" (this browser only)
- F034 "Could not check your access" page with Try again (role read failed, fails closed)

**`/` Dashboard (Admin, Finance, Support, Viewer)**

- F037 "Money figures as of HH:MM" + Refresh link
- F039 Right now: Online now (+ how many can work) → People online
- F040 Right now: Getting quotes (+ quotes in last hour) → open jobs
- F041 Right now: Hired & in progress → active jobs
- F042 Right now: Overdue → overdue jobs (Tasks has an Overdue chip, no count tile)
- F043 Right now: Waiting for poster's OK → waiting jobs
- F045 Right now: Help requests waiting → Help requests (on Today (count only on Support tab))
- F052 Stat: Jobs finished today → list
- F055 Stat: Workers available now (older setting, with hint) → list
- F056 Stat: Waiting for poster's OK → list
- F058 Earnings range tabs: 7 days, This month, Last month, 3 months, 1 year, 5 years, All time
- F059 "Where today's money came from": Commission, Service fee, Promotions, Corrections, each with bar and link to its entries
- F061 Live feed filters: Everything, Jobs, Money (not Sales), People, Help & safety
- F062 Live feed Pause / Resume (counts held lines)
- F068 Tools links: Sentry, Inngest, ImageKit dashboards (or "Add X to link it")
- F070 "Whose money is in TaskDrop's account": total, stack bar and 7 rows (own earnings, escrow, wallet balances ready, posters' wallet credits, clearing, withdrawals on the way, refunds owed), each linked (design shows "Where held money sits" by task stage only)
- F071 Note when refunds owed can't be counted (server key missing)

**`/` Dashboard, Sales variant**

- F074 Right now live strip (without disputes)
- F078 Live feed (no money group)

**`/money` Earnings & escrow**

- F085 Figure: Earned today + change vs yesterday → Today's entries
- F087 Figure: Earned in total, since first day, finished-job count → All entries
- F088 "Where the earnings came from" table: Commission / Service fee / Promotions / Corrections × Today / range / In total, every cell links to entries; total row
- F090 Chart view tabs: Total / By type (stacked commission, fee, promotions)
- F091 Chart range tabs: 7 days, This month, Last month, 3 months, 1 year, 5 years, All time
- F092 Escrow notice "Is this TaskDrop's money? Not yet."
- F097 "Who the money in the account belongs to" (same WhoseMoney block as Dashboard)

**`/money/entries` Earnings entries (not in the sidebar)**

- F099 Ledger list: every earning, one line each: when, type pill, job link, note, amount (design links "All money entries" but shows no entries screen)
- F100 When filter: Today, Last 7 days, This month, Last month, All time
- F101 Type filter: All types, Commission, Service fee, Promotions, Corrections
- F102 Page sum "N entries adding up to ₹X"
- F103 Pages: Newest / Older (50 per page)

**`/money/reconcile` Money check**

- F106 Range tabs: Last 7 / 30 / 90 days
- F107 Summary of 6 checks with OK or count: funded without paid payment, paid but not credited, payment never completed, withdrawal waiting too long, paid without transfer reference, finished with no commission

**`/payouts` Payouts (withdrawals)**

- F110 Search box "Find a person" (by name) + Clear search
- F112 RazorpayX balance warnings: "Couldn't read the RazorpayX balance" / "RazorpayX is ₹X short, add at least ₹Y"
- F114 Stat: On the way (count, amount)
- F115 Stat: Paid today (amount, count) (on payouts (only "Paid to helpers today" on Today))
- F116 Stat: Ready to withdraw (earnings people can still ask for) → People with money
- F118 Stage labels: Pay by hand, Waiting, You're paying, Locked N days: pay or give back, Sending to RazorpayX, No answer from RazorpayX, Waiting for money in RazorpayX, Waiting for approval in RazorpayX, Check, With the bank
- F119 Copy UPI id / account number buttons in table
- F121 "On the way" table (sent, waiting for bank)
- F122 "Came back" table, last 7 days: when, person, amount, why (bank sent it back / reason), Message button
- F123 "Settled" history (30 days): when, person, amount, result (Paid / Paid by RazorpayX / Came back / Cancelled), reference or reason; summary paid in 30 days + all time
- F124 Settled filter tabs with counts: All, Paid, Came back, Cancelled
- F125 Settled pages (25 per page)
- F126 "Withdrawal requests per day" area chart with total, range 7 / 30 / 90 days
- F127 Click a chart day to list who asked that day (time, person, amount, status), Close
- F128 "How withdrawals are paid" switch: Manual / RazorpayX (In use, Not set up, "Set up RazorpayX first") (design "How money flows" is the Plan B switch, not this)
- F129 Money position: In RazorpayX, Ready to withdraw, Still clearing, On the way, Held for people, TaskDrop's own; Full breakdown link

**`/payouts/[id]` One withdrawal**

- F131 Header: amount, status pill, person link + Worker/Poster tag, asked when, short ref (design has no payout detail page)
- F132 "You can look at this, not pay it" notice for non-money roles; account details masked
- F133 "Couldn't load the payment details" notice (queue did not return it)
- F134 Account changed since asking: notice + switch to pay the account on file now / the saved one
- F135 Step 1: UPI QR code (amount and note filled in), UPI id + amount with Copy, "Open it in your UPI app" link on phones
- F136 Step 1 (bank): name, account, IFSC, amount, each with Copy
- F137 "Can't send yet" when no account on file
- F138 "I'm paying it now: stop X cancelling" (lock withdrawal)
- F142 "Pay it by hand instead" (take it away from RazorpayX)
- F144 Result notices: Sent (reference), Bank sent it back / Didn't go through (reason, message link), Cancelled by person
- F145 Details: amount, status, asked for, last change, sent to, paid how, bank reference, reason, RazorpayX payout id, RazorpayX says, times sent, RazorpayX fee, withdrawal id + Copy
- F146 Who asked: name, uses TaskDrop as, earnings left to withdraw, open their page
- F147 Their other withdrawals list with status

**`/refunds` Refunds**

- F148 "This list needs the server key" notice when the service key is missing
- F152 Razorpay payment id with Copy

**`/support` Help requests**

- F158 Status tabs: Waiting for a reply, Answered, Resolved, All (design shows one list, no status tabs)

**`/reports` Business reports**

- F175 Stat: Jobs cancelled → cancelled jobs
- F176 Stat: Getting quotes now → open jobs
- F177 Stat: Open disputes → disputed jobs
- F178 Stat: Quotes sent + share of jobs that got a quote
- F179 Stat: New people → list
- F180 Stat: People in total + active in period
- F181 Stat: Average worker rating
- F183 Line chart per day: paid in for jobs vs TaskDrop earned
- F185 Health of the marketplace: finish rate, cancel rate (+ count), disputes decided + rate, wallet top-ups (with before values)
- F187 Marketplace by category table: posted, got an offer, typical wait, slowest 1 in 10, filled

**`/tasks` Jobs**

- F198 Count line + "₹X held in escrow for them" (Money held filter) + one-line meaning of the filter
- F201 Pages of 30 (jumps back to the last real page)

**`/tasks/[id]` One job**

- F204 "This dispute has no money to decide over" (never paid, can only be cancelled)
- F210 Sales sees only the price (no earnings, no payment)
- F219 TaskDrop's earnings from this job: ledger lines (type, time, amount) → entries
- F220 Reviews: stars, author, about poster/worker, comment
- F221 "Find similar jobs" link

**`/users` People**

- F225 Tag filter chips with people counts (Any + every tag)
- F226 Count line + one-line meaning of the filter
- F231 Column wallet + clearing amount
- F232 Columns joined date and last seen (design shows phone and activity instead)
- F233 Pages of 30

**`/users/[id]` One person**

- F236 Suspended banner: reason, by whom, when + "Let X back in" with optional note (no unsuspend in design)
- F237 Deleted-account banner: by whom / themselves, when, reason
- F240 Manual wallet corrections list (reason, time, amount)
- F246 "Looked after by" owner picker (No owner / staff)
- F254 Person id
- F257 Money tab: manual corrections
- F259 Follow-ups tab: add a follow-up (what, details, due date, give to staff)
- F260 Devices tab: sign-in methods + last signed in

**`/alerts` Alerts (team messages from background jobs)**

- F268 Tabs: Unread (count) / All
- F270 Daily digest alert text (design lists the job on Health only)
- F271 Mark one alert read
- F272 Mark all as read (team-wide)

**`/reports-queue` Reports (flagged content)**

- F280 Mark acted on (optional note)
- F282 Handled: by whom + resolution note

**`/copyright` Copyright notices**

- F285 Log a notice form: who sent it, their email, their work, where it is (their words), the job link/id, or the person link/id
- F286 "What the law expects" explainer (six parts, take down fast, counter-notice, 10-14 business days, repeat infringers at 3)
- F290 Upheld-notice count per uploader; red "repeat infringer" pill at 3 (suspend from People page)
- F293 Close the whole post (note)
- F296 Record "Counter-notice received" (note) (only shown as a stage)
- F297 "Wait until <date>" before restore

**`/feedback` Feedback board**

- F301 Tab: Private notes (what people send with "Send feedback": kind, author, when, page, text, photos/PDFs)
- F305 Hide comment / Show it again
- F308 Hide idea (reason) / Put it back on the board

**`/catalog` Skills & categories**

- F313 Rename (audit-logged, changes every profile and job)
- F314 Add phrase (synonym that points to this term)
- F315 Remove a phrase (× button)

**`/crm` Customer hub**

- F319 Stat: People (total)
- F320 Stat: Suspended (count) → suspended people
- F322 Stat: Messages sent (total)
- F323 "What you can do here" explainer
- F325 Recent notes (with total count)
- F328 Tags list with people counts, click to filter
- F329 Delete a tag (taken off N people)

**`/crm/tasks` Follow-ups & pipeline**

- F330 Customer pipeline: Signed up, Engaged, Funded, Completed one, Repeat; count, share of everyone, "at risk" (not seen 30 days)
- F331 Tabs: Mine, Everyone's open, Done
- F333 Finish / Reopen a follow-up

**`/crm/leads` Leads**

- F335 Download leads CSV (name, kind, stage, contact, source, owner, note, added, stage since, added by, in the app, id)
- F336 "How leads work" explainer
- F337 Stage tabs with counts: All, New, Contacted, Talking, Won, Lost
- F338 Owner tabs: Anyone's, My leads, No owner, pick a staff member
- F340 Edit a lead: stage, looked after by, note
- F341 Add a lead: name, contact, kind, where found, note, looked after by

**`/crm/segments` Segments**

- F342 Owner tabs: Everyone's customers, My customers, No owner, a staff member's
- F343 Find people filters: who (everyone / workers / only post), joined within N days, not seen for N days, has tag, wallet at least ₹ (not Sales), platform, app older than version, looked after by, never posted, available now, include suspended ("New group" opens a demo toast only)
- F344 Result count + plain description of the filters
- F346 Download spreadsheet of the matches
- F347 Matches table: tick box, name, does, wallet (not Sales), joined, last seen, owner; pages of 30
- F348 Tick people (or all on page) and set who looks after them
- F351 Delete a saved segment

**`/crm/messages` Messages (broadcast)**

- F355 Repeat-send protection (same text in 2 min) and per-staff rate limit

**`/settings/team` Team & access**

- F361 Figure: team size by role
- F363 Figure: panel sign-in mode (Allowlist with N accounts / Role only)
- F364 Notice: emails, last sign-in and authenticator hidden without the service key
- F370 Staff alerts on/off per person (own: anyone; others: Admin)

**`/settings` Money & timing**

- F378 Days a poster has to approve (auto-release)
- F380 Longest video on a job post (seconds)
- F383 Most a new account can withdraw in a day (rupees)
- F385 Finished jobs that end "new"
- F386 Promotion daily budgets (rupee list)
- F387 Promotion lengths (days list)

**`/settings/switches` App switches**

- F391 Guard: "Do not turn on the authenticator code yet" (some staff have none; refuses if you have none)
- F394 Last changed time per switch
- F395 "How withdrawals are paid" shown, with a link to change it on Payouts

**`/settings/controls` Web, Android & iOS (kill switches)**

- F397 "How these work" notice (Everywhere vs one platform; apps re-check about once a minute)
- F398 Columns per place: Everywhere, Web, Android, iPhone/iPad (a platform can only add restrictions) (design switches are one global value each)
- F399 Each switch change asks "Why" (reason)
- F413 Per place: maintenance message text (design says "shows your message", no field)
- F415 Per place: update link (https)

**`/settings/rules` Rules (CRM automation)**

- F421 Edit a rule (name, when, days)
- F422 Delete a rule
- F423 Add a rule: name, when (Paid in then nothing posted / Dispute opened), days 1-90; starts off
- F424 Latest automation follow-ups (10): title, Open / Done

**`/settings/integrations` Integrations (read-only)**

- F425 Supabase: Connected / Not reachable, project ref, answered in ms
- F426 Service key: Set / Missing + how to add it
- F431 Note: keys and secrets are never shown; where to change them

**`/settings/health` System health**

- F432 "Check again" button
- F434 Checks list with ms or failing detail: Database, Money ledger, Earnings totals, Payout queue, RazorpayX money position, Customer hub, Copyright notices, Account deletion, Audit log (design shows background jobs and quotas instead)
- F436 Latest activity: money moved, job posted, person joined, help request (time ago, links)
- F437 This server: environment, version (commit), region, Node version

**`/settings/audit` Audit log**

- F442 Pages of 40

**`/security` My security**

- F446 Note when the requirement is switched off

## Partly in the design (159)

**Shell (every page)**

- F003 Number badges on Payouts, Refunds, Disputes and Help requests links (red when money) (only one Inbox count and tab counts; no per-item badges for payouts/refunds/disputes/help in the nav)
- F010 "Payouts" chip linking to /payouts (replaced by Inbox icon; no direct payouts chip)
- F012 Today's date in the top bar (date only in the Today page heading)
- F013 Your email, links to Security page (avatar initials + role, links to `#/security`; email not shown)
- F018 Idle sign-out after 30 min (env `ADMIN_IDLE_MINUTES`); activity ping every 4 min; untouched tab is sent to sign-in with the reason (setting row "Sign staff out after idle" in `#/settings`; no signed-out message/flow)
- F023 Withdrawal not found card with link to Payouts (generic not found only)
- F024 Whole-app crash page "Something went wrong" (generic error state only)
- F026 Gold "Money buttons are locked until you verify your authenticator" notice with Enter a code / Set up authenticator (lock icons on buttons + top chip; no in-page notice)

**`/` Dashboard (Admin, Finance, Support, Viewer)**

- F038 "Right now" live strip, numbers flash when they change, skeleton while loading (4 static tiles on `#/today`; no live strip)
- F044 Right now: Open disputes ("money frozen until you decide") → Disputes (inside "Problems" tile count)
- F048 Earnings tile: today + change vs yesterday + all-time total since first day + finished-job count; links Today's entries / All earnings ("Our earnings this month" tile on `#/money/overview`; no today, delta vs yesterday or all-time)
- F049 Escrow tile: held now, job count, plain explanation of commission split, extra "hired jobs not paid yet" amount; link to escrow jobs ("Money held for tasks" tile; unpaid-hired amount missing)
- F050 Paid out tile: today count + amount, all-time count + amount; link to payout history ("Paid to helpers today" only)
- F051 Withdrawals on the way tile: amount, count, how many need you (list on `#/money/payouts`, no total tile)
- F054 Stat: New people today → list (only on the Sales Today ("Signups today"))
- F057 "What TaskDrop earned" line chart: total, previous period dashed for compare, sum + delta (14-day bar chart on `#/money/overview`; no compare line or delta)
- F060 Live feed: plain sentences, newest first, each opens the job/person/payout/help request (static "Live now" card on `#/today`)
- F063 System health card: nightly check (internal) and (Razorpay) with checked count, Never ran / Too old / differences / All fine ("Health" card on `#/today` (money check line only))
- F065 System health card: app service (app-config) ping with ms / error ("App and server: Fine", no ms or error detail)
- F066 System health card: Open Sentry link (or "Add SENTRY_PROJECT_URL") (Sentry crash count shown, no link)
- F072 "Latest money movements" table (8): when, what, job or person link, amount, status pill; "All entries" (`#/money/moves` table and Razorpay messages timeline)

**`/` Dashboard, Sales variant**

- F075 Needs you now (top 6) (Sales Today has no inbox list; Inbox limited to help)
- F076 Stats: jobs posted today, new people today, workers available now, waiting for OK, finished today ("Signups today" and "Help requests open" only)
- F077 "Your work" links: Customer hub, Follow-ups & pipeline, Leads, People ("All follow-ups" link + follow-ups due table)

**`/needs-you` Needs you now**

- F082 Summary pill: All clear / N late / N due soon / N waiting (counts per chip, no late / due-soon summary)

**`/money` Earnings & escrow**

- F084 "How money moves through TaskDrop" 4-step explainer with live fee %, review days, commission %, clearing days (one-line Plan B text in header and "How money flows" row)
- F086 Figure: earned in chosen range + change vs previous period → entries ("Our earnings this month" tile with % vs Oct)
- F089 "Earnings over time" line chart with comparison line (14-day bar chart, no compare)
- F094 Figure: Releases in the next 24 hours (poster has not replied) → waiting jobs ("Waiting to release" tile (different rule: done, next hourly run))
- F095 Figure: Hired, not paid for yet (count) → hired jobs ("Unpaid tasks that expired" card on `#/money/moves`)
- F096 Escrow jobs table: job, poster, worker, status pill, held amount / Not paid, "What happens next" (auto-release time, frozen for dispute, running late) ("Where held money sits" bars by stage; no per-job table)
- F098 "Latest earnings entries" (10): when, type pill, job, amount; All entries ("All money entries" button only)

**`/money/reconcile` Money check**

- F105 Open a run to see each difference: Important / Check pill, linked job or payout, date, amount, detail; Razorpay payment lines ("To explain" item for today only)
- F108 "What to look at" table: problem (linked), subject, when, amount, detail ("To explain" list)

**`/payouts` Payouts (withdrawals)**

- F111 Money-lock notice (needs authenticator) (lock icon/chip only)
- F113 Stat: Waiting for you (count, amount) (inbox item count; no stat)
- F130 "How it works" 3-step explainer (collapsed) (gold note "Only for older wallet balances")

**`/payouts/[id]` One withdrawal**

- F140 "Can't pay it?": put the money back in their earnings / "It didn't go through", with reason they see ("Give back" on `#/money/payouts` with no reason field)
- F141 With RazorpayX card: stage help text, Check with RazorpayX (check-all on the list only)
- F143 Stuck: "Give ₹X back" (asks RazorpayX first) ("Give back" exists, no RazorpayX-first step)

**`/refunds` Refunds**

- F149 How-it-works explainer (amount worked out by the database, 5-7 days) ("5-7 days" in the confirm text)
- F150 Card title "N refunds owed" + total owed, oldest first ("Recent refunds" table (no owed total))
- F151 Columns: job, poster, paid, kept for worker (cancel fee), owed back, cancelled at (task, to, amount, status, date; no paid / kept-for-worker split)

**`/disputes` Disputes (read-only list)**

- F155 How-it-works explainer (pay worker / refund poster) (decision card explains each choice)
- F156 Title "N open disputes" + total frozen in escrow, oldest first, "showing X of Y" (Tasks "Disputes" chip and Inbox "Disputes" chip; no total frozen)
- F157 Columns: job, poster, worker, reason given (+ who said it), frozen amount / Never paid, waiting time, Decide (Inbox row shows parties, amount, waiting; reason only on task page)

**`/support` Help requests**

- F159 "N conversations", showing X of Y (count on the Help requests tab)
- F160 Columns: subject, from (person link), about (category), status pill, last message time (name, status/age pill, id, subject; no category column)

**`/support/[id]` One help request**

- F161 Header: subject, status pill, from (person link), category, page it was sent from, opened time (id, from, app version; no category, page or opened time)

**`/promotions` Promotions**

- F166 Figure: Showing now (promoted jobs count) ("Paid promotions running" list, no count)
- F167 Figure: Paid for (latest N) → Promotion earnings entries ("This month: ₹X from promotions")
- F168 Latest promotions table (100): job, paid by, amount, length in days, status (Not paid yet / Showing now / Finished / Cancelled), run dates (task, area, paid, views → offers; no payer, length, status or dates)
- F169 Stop a promotion with a reason the advertiser sees (unused part back to their wallet) ("Pause" on `#/growth/promotions` (no reason field; design gives it to CRM roles))

**`/reports` Business reports**

- F170 Period tabs: 7 days, 30 days, 90 days, 1 year (select with Last 30 / Last 7 / This year)
- F171 Money: Value of jobs finished (GMV) → finished jobs ("Money through TaskDrop" (paid by posters))
- F182 "How the business is doing": Paid in for jobs, TaskDrop earned, Take rate, Jobs finished, New people, Jobs posted, each with change vs the days before (4 tiles, only "+18%" on tasks posted; no take rate)
- F186 "Do tasks get offers": time to first offer (typical + slowest 1 in 10), fill rate, got at least one offer (per-area "Filled" and "Time to first offer" columns only)
- F188 Marketplace by area table (top 15): same columns ("Marketplace by area" (posted, filled, time to first offer, helpers active))
- F190 Retention grid "Do people stay active?": sign-up week, people, same week to +8 weeks (cohort table with 4 weeks, no people column)
- F191 "What the promotions earned": started, running now, spent, views, taps, tap rate (per-promotion views → offers on `#/growth/promotions`)

**`/tasks` Jobs**

- F196 Search jobs by title (keeps the filter) (top search finds tasks; no search box on the Tasks list)
- F197 Filter tabs: All jobs, Money held, Getting quotes, Hired & in progress, Overdue, Waiting for poster's OK, Disputed, Finished, Cancelled, Posted today, Finished today (chips All, Disputes, In progress, Waiting for offers, Overdue, Done; missing Money held, Waiting for OK, Cancelled, Posted today, Finished today)
- F199 Columns: job (title, category · place or posted date), poster, worker / Not hired, status pill with hint, price (agreed / budget), held now, last change (task (title, id, area), status, poster, helper, price, posted; no held-now or last-change, no agreed/budget label)

**`/tasks/[id]` One job**

- F207 Money card: agreed price / budget, paid by poster (not yet), service fee, poster paid in total, worker gets, TaskDrop earned / will earn (held now, price, poster fee, commission; no "worker gets" or earned/will-earn)
- F208 "Where the money is now" notice (not paid / held since / frozen / released + withdrawable date / refunded / owed via Refunds / back to wallet) (status pill "Held" / "Frozen for dispute")
- F211 "What the poster asked for": description text, category · place · kind (Task details (price, when, checklist, address); no description)
- F212 Photos and files: job photo + worker proof, thumbnails open full size (signed, 2 h), video/file tiles, missing-photo reason, ImageKit not set up notice ("Proof photos" tab only inside a dispute)
- F213 Quotes table: worker (Chosen pill), price, message, sent ("Offers" tab only inside a dispute)
- F215 Visibility card: Hide this job (reason required) / Make visible again, shows why hidden ("Hide this task" with undo; no reason field, no "why hidden" line)
- F217 Cancel and refund (open or locked job; reason the poster sees; wallet refund with no fine) ("Cancel with full refund" with no reason field)
- F222 Job id and "checked at" time (id in header)

**`/users` People**

- F223 Search by name or username (keeps filter and tag) (top search only; no search box on the People list)
- F224 Filter tabs: Everyone, Joined today, Online now, Available now, Workers, Money in wallet (not Sales), Admins, Suspended, Deleted (chips Everyone, Hire, Earn, Suspended, New accounts; missing Online now, Available now, Money in wallet, Admins, Deleted)
- F227 "Download spreadsheet" CSV of the current view (name, does, place, joined, last seen, wallet + clearing for money roles, tags, suspended, owner, email + phone when allowed, id); every export audit-logged, 10 per minute (CSV button; audit log, rate limit and per-role columns not shown)
- F228 Columns: avatar + name + @username + place + tags (name, area; no username or tags)
- F230 Column rating as worker and as poster with review counts (one rating number)

**`/users/[id]` One person**

- F234 Header: initials, name, pills (Admin, Worker, Poster, Available now, Deleted, Suspended), tags, @username, place, joined, last seen (name, phone, area, joined, Hire/Earn/Suspended pills, tags; no Admin pill, username or last seen)
- F235 Suspend (reason kept on record; signs them out; admins can't be suspended) ("Suspend until a date" (no reason field))
- F239 Wallet card: ready to withdraw (→ withdrawals), still clearing with clearing days ("Old wallet balance" + "Paid to them, all time")
- F241 Notes & follow-ups: add private note with optional follow-up date ("Add note" button (no date))
- F242 Notes list: author, time, follow-up date (due highlighted), pin/unpin, mark follow-up done/reopen, delete (notes shown as text; no pin, done or delete)
- F244 Jobs they worked on: job, status, poster paid (not Sales), hired (one Tasks table (no hired date / poster paid))
- F245 Activity timeline: everything that happened to them, newest first, with links (Safety history + History tabs only)
- F247 Tags card: list with remove ✕, add a tag with suggestions (tags shown, no add/remove)
- F248 Message card: send title + text to their notifications and phone push; "Sent to X" history (title, text, by, when) ("Message" button with text box; no title, no sent history)
- F249 Contact card: phone and email in full for Admin and Support (opening is audit-logged), masked for others; bio; "needs server key" note (masked phone + "viewed phone number" audit line; no email, no reveal rule)
- F250 Ratings card: as worker / as poster with counts, list of reviews (stars, author, role, comment, job link) (one rating tile)
- F251 Withdrawals list: status, time, reference, reason, amount → payout page ("withdrawal waiting" line in Money tab)
- F252 Past suspensions: reason, by, when, lifted when/by, note (Safety history timeline)
- F253 Delete account: shows blockers (admin, balance, clearing, payout on its way, active/funded jobs, working now, promotion, payment pending) or Delete with reason ("Delete account" with blocked note; no reason field)
- F255 Money tab: at a glance (ready, clearing, paid in, withdrawn) (Money tab (held, paid all time, payee account, old wallet))
- F256 Money tab: payments in, latest 50 (when, funding a job / wallet top-up, status, amount) (small money table (released, commission))
- F258 Follow-ups tab: list (title, owner, due, done by, detail) with Finish / Reopen (one static follow-up line)

**`/devices` Devices**

- F264 By platform (Web, Android, iPhone/iPad, Windows, Mac): installs, people, last seen, share on newest version, "N below the minimum" pill (tiles Android, Web, Below lowest version, iOS; no people / last seen / share on newest)
- F265 By app version table: platform, version, devices, people, last seen, Outdated / Latest ("Versions in use" bars (version + count))

**`/alerts` Alerts (team messages from background jobs)**

- F269 Alert list: title, kind pill (Withdrawal, Payout failed, Help request, Dispute, Daily digest), body, time, read (Inbox shows waiting items; no alert history list)

**`/reports-queue` Reports (flagged content)**

- F273 Tabs: Open / Handled (open list only; no Handled history)
- F276 Hide this message (reason) / Show it in the chat again ("Hide" with undo toast; no reason, no show-again later)
- F278 Remove this review (reason; rating re-worked) / Put the review back ("Hide" covers remove; no put-back, no reason)
- F279 Warn them (person reports; text they read; closes report) ("Warn" without message text)

**`/copyright` Copyright notices**

- F287 Three tables: Waiting for a decision, Taken down, Closed (one "Copyright notices" table with stage pill)
- F288 Notice column: complainant, email, work, received ago (complainant + short description)
- F289 On TaskDrop column: job link, uploader link, material text, photo thumbnail ("About" (e.g. "TD-4799 photo"))
- F291 Status pill (Waiting, Taken down, Counter-notice, Rejected, Restored) + what was removed + restore-from date + note (stage pill with promise hours)
- F292 Take down the job's photo or video (note) (one "Take down" button)
- F294 Take down their profile photo (note) (generic "Take down")

**`/feedback` Feedback board**

- F300 Tabs with counts: New, Under review, Planned, In progress, Done, Not planned, Hidden (chips Top voted, New, Planned, Done (no counts, no Under review / In progress / Not planned / Hidden))
- F302 Idea card: title, kind, author, when, votes, status or Hidden pill, text, hide reason (votes, title, comment and photo counts, status pill)
- F303 Idea photos/files (open full size) ("2 photos attached" count only)
- F304 Comments (expand): author, when, Hidden pill (comment count only)
- F306 Set status (New, Under review, Planned, In progress, Done, Not planned) + public note; notifies author and voters ("Change status" select (Planned, Done, Not now), no note)

**`/catalog` Skills & categories**

- F310 Kind tabs: Skills / Categories (`#/safety/skills` covers skills only; no Categories)
- F311 Filter tabs with counts: All, Added by workers, New this week, Hidden (one list "New skills people added")
- F312 Ranked table: rank, name (+ Hidden pill), workers / tasks count, came from (Built in / Added by X on date), also matches (phrases) (skill typed, used by, looks like; no rank, source or phrases)
- F317 Hide / Unhide a worker-added term ("Hide" for junk; no Unhide)

**`/crm` Customer hub**

- F318 Header shortcuts: My customers, Leads, Segments, Send a message (Growth tabs (no hub page, no "My customers"))
- F321 Stat: Follow-ups waiting (+ due now) (Sales Today "Follow-ups due today" tile)
- F324 Follow-ups from notes: person, note text, Due / Coming up + date, Done button ("Follow-ups due" table (who, why, due), no Done)
- F326 Latest messages: title + text, sent to, people, when, by; All messages ("Last sends" (date, to, opened %))
- F327 Suspended list: person, reason, date (People "Suspended" chip only)

**`/crm/tasks` Follow-ups & pipeline**

- F332 Table: what (detail, "Automatic" pill), about (person link), due (red Overdue) or done date, owner or done by ("Follow-ups due" (who, why, due))
- F334 Add a follow-up: what, details, due date, give to (staff) ("Add" button (tier 1), no form)

**`/crm/leads` Leads**

- F339 Lead row: name, kind pill (Business/Person/Other), stage pill, link to their app account, contact, source, added when/by, stage since, owner, note (name, from, stage)

**`/crm/segments` Segments**

- F349 Save these filters as a segment (name) ("New group" button)

**`/crm/messages` Messages (broadcast)**

- F352 Send to: grouped picker with live counts (your filters from Segments, Everyone, All workers, People who post…, each saved segment, each tag) ("Who" select of saved groups only)
- F357 "Sent so far" history (30): title + text, sent to, people, when, by ("Last sends" (date, to, opened %))

**`/team/performance` Team performance**

- F358 Range tabs: Last 7 / 30 / 90 days (follows the Reports period select)
- F359 Per staff: name + role, follow-ups done, on time %, open / overdue, notes, help replies, first reply time, reports handled, disputes decided, customers owned ("Staff performance" card in `#/reports` (answered, avg first reply))

**`/settings/team` Team & access**

- F362 Figure: authenticator set up "X of N" (per-person Authenticator column)
- F365 "You are <role>: only a full Admin can change the team" (team readable by all non-Sales) (design locks the whole Team page for non-Admin)
- F368 Team table: name, signs in with, role badge, alerts, panel access (gold pill when not on the allowlist), authenticator, last signed in, actions (person + email, role, authenticator, last seen; no signs-in-with, alerts or allowlist columns)

**`/settings` Money & timing**

- F373 Gold notice "These change the app for everyone, straight away" ("Applies to new tasks only" text in the change dialog)
- F374 Each setting shows label, help, current value and "Last changed" time (label, help and value; no last-changed time)
- F389 "Advanced (ads pricing and others)": every other setting key with a readable value, read-only ("3 old unused settings are hidden")

**`/settings/controls` Web, Android & iOS (kill switches)**

- F400 Maintenance mode per place (global "Maintenance mode")
- F401 Require a verified phone number per place ("On via Everywhere") (global "Phone must be checked before posting or offering")
- F402 New sign-ups per place (global switch)
- F403 Sign in with phone per place (global switch)
- F404 Sign in with Google per place (global switch)
- F405 Sign in with Apple per place (global switch)
- F406 Sign in with username and password per place (global switch)
- F407 Posting jobs per place (global switch)
- F408 Sending offers per place (global switch)
- F409 Wallet top-ups per place (Money pill) (global "Posters can top up a task price")
- F410 Withdrawals per place (Money pill) (global "Old wallet withdrawals")
- F411 Promoting jobs per place (global "Paid promotions")
- F412 Photos in chat per place (global switch)
- F414 Per place: oldest app version allowed (one "Lowest app version allowed" (tier 3))
- F416 Per place: banner text, look (Information / Warning / Serious), link, end date (one global "Top banner" on `#/content` with preview)
- F417 Devices card: installs by platform, active this week, need an update; by version with "Below the minimum"; latest report time (`#/devices`)

**`/settings/rules` Rules (CRM automation)**

- F419 Rule list: name, kind + plain description (e.g. paid in N days ago, nothing posted), On/Off pill ("Automatic follow-ups" rows (different example rules))

**`/settings/integrations` Integrations (read-only)**

- F427 Panel sign-in: allowlist on / role only, allowed accounts (masked for non Admin/Support), idle minutes (idle setting row only)
- F428 RazorpayX payouts: Not set up / Error / Connected, how withdrawals are paid, balance ("Connected services: Razorpay" pill)
- F429 Razorpay payments: Receiving / No payments yet, last payment time (Razorpay pill only)
- F430 Push notifications: Active / No devices, phones registered ("Push notifications: Working")

**`/settings/health` System health**

- F433 Summary notice: N checks failing / money check needs a look / Everything is working (checked time) (page subtitle only)

**`/settings/audit` Audit log**

- F438 Area filter: Everything, Settings, Admin access, Payouts, Wallet changes, Dispute decisions, Suspensions, Messages sent, Copyright, Staff actions (kind select All, Money, Switches, Safety, Privacy)
- F439 Lines filter: Without heartbeats, Staff only, Every line ("Who" select (Everyone, each staff member, System))

**`/security` My security**

- F444 Set up authenticator: QR code, manual key, type the 6-digit code ("Set up a new phone" button; no QR or key screen)

## Full list by page

## Shell (every page)

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F001 | Left sidebar, 5 sections, 25 links (TD logo, "Admin panel") | notice | All | none | `Sidebar.tsx` | Covered: new 8-group nav (`#/today` … `#/settings`) |
| F002 | Menu hides money items (Earnings, Payouts, Refunds, Money check, Disputes, Promotions, Business reports) and Admin & configuration for Sales | notice | Sales | none | `staffCanSee` | Covered: nav hides Money for Sales, locks items per role |
| F003 | Number badges on Payouts, Refunds, Disputes and Help requests links (red when money) | notice | All (money badges zeroed for Sales) | none | `getNavCountsFor` | Partly: only one Inbox count and tab counts; no per-item badges for payouts/refunds/disputes/help in the nav |
| F004 | "Needs you now" link badge = live total, red when something is late | notice | All | none | `LiveProvider` needs summary | Covered: Inbox count in nav, top bar and phone bottom bar |
| F005 | Sidebar footer "Staff only. Every money action asks you to confirm first." | notice | All | none | static | Missing |
| F006 | "Skip to content" link for keyboard users | action | All | none | layout | Missing |
| F007 | Top-bar search box "Search jobs and people" (opens /search) | search | All | none | `/search` page | Covered: top search (people, tasks, payments, tickets) with instant results |
| F008 | Live connection chip: Connecting / Live / Reconnecting / Live off | notice | All | none | Supabase Realtime + `/api/live` | Missing |
| F009 | Alerts button: chime + desktop notification for withdrawals, failed payouts, disputes, help requests, copyright notices (per role); states "Turn on alerts", "Alerts on", "Alerts on · sound only", "Alerts off" (team setting, links to team page); choice remembered in this browser | action | All except Viewer and Sales get alerts | none | `LiveProvider`, `live-alerts.ts` | Missing |
| F010 | "Payouts" chip linking to /payouts | action | Not Sales | none | link | Partly: replaced by Inbox icon; no direct payouts chip |
| F011 | "Unlock money actions" chip when MFA is required and not yet verified (opens /security) | action | Not Sales | MFA | `mfaState` | Covered: `Unlock money actions` chip (design adds a 10-min unlock) |
| F012 | Today's date in the top bar | notice | All | none | layout | Partly: date only in the Today page heading |
| F013 | Your email, links to Security page | action | All | none | layout | Partly: avatar initials + role, links to `#/security`; email not shown |
| F014 | Your staff role chip (non-Admin), links to Team page when allowed | notice | Finance, Support, Sales, Viewer | none | layout | Covered: role label in top bar |
| F015 | Sign out button (ends the panel session) | action | All | none | `endPanelSession` server action | Missing: design has no sign-out for yourself |
| F016 | Browser tab title shows "(N)" waiting count | notice | All | none | `LiveProvider` | Missing |
| F017 | Live data re-read every 60 s and when the tab comes back into view | notice | All | none | `/api/live`, `/api/live/token` | Missing (design is static; "updates by itself" only in copy) |
| F018 | Idle sign-out after 30 min (env `ADMIN_IDLE_MINUTES`); activity ping every 4 min; untouched tab is sent to sign-in with the reason | notice | All | none | `IdleGuard`, `/api/auth/ping`, middleware | Partly: setting row "Sign staff out after idle" in `#/settings`; no signed-out message/flow |
| F019 | Gold STAGING ribbon on every screen (sign-in too) unless environment = production | notice | All | none | `EnvRibbon`, app control `environment` | Covered: ribbon + prod/staging label in confirm dialogs |
| F020 | Page loading state "Loading the latest numbers…" | notice | All | none | `loading.tsx` | Covered: `#/states` Loading |
| F021 | Page error card "This page couldn't load", reason list, error text, Try again (reported to Sentry) | notice | All | none | `error.tsx` | Covered: `#/states` Could not load |
| F022 | Not found card with links to Jobs and People | notice | All | none | `not-found.tsx` | Covered: router "Not found" screen |
| F023 | Withdrawal not found card with link to Payouts | notice | Not Sales | none | `payouts/[id]/not-found.tsx` | Partly: generic not found only |
| F024 | Whole-app crash page "Something went wrong" | notice | All | none | `global-error.tsx` | Partly: generic error state only |
| F025 | Every money/delete/settings action: first click opens a panel saying what happens to whose money, second clearly-labelled button sends; Cancel; error text with "Open the Security page" when a code is needed | action | All | two-step | `ConfirmAction.tsx` | Covered: confirm modal tiers 1-3 (design adds type-a-word) |
| F026 | Gold "Money buttons are locked until you verify your authenticator" notice with Enter a code / Set up authenticator | notice | Money roles | MFA | `MoneyLock.tsx` | Partly: lock icons on buttons + top chip; no in-page notice |
| F027 | Server-side per-staff rate limits on suspend, warn, delete account, broadcast ("too fast" message) | notice | All | none | `action-limits.ts`, `actionLimit` | Missing |

## Sign-in and access pages

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F028 | Sign-in page "Ops console", staff-only text | notice | Anyone | none | `/login` | Missing: design has no sign-in screen |
| F029 | Continue with Google | action | Anyone | none | `/auth/google`, `/auth/callback` | Missing |
| F030 | Sign in with @username and password | action | Anyone | none | `/api/auth/password` → `password-auth` edge function | Missing |
| F031 | Sign-in error messages (wrong account, expired, idle sign-out reason) | notice | Anyone | none | `login-errors.ts` | Missing |
| F032 | Admin allowlist check (account must hold `admin` in user_roles / allowlist) | notice | Anyone | none | `auth.ts` `checkAdmin` | Missing |
| F033 | "Not an admin account" page: shows signed-in email, "Sign out and use another account" (this browser only) | notice + action | Non-staff | none | `/not-authorized`, `endPanelSession('local')` | Missing |
| F034 | "Could not check your access" page with Try again (role read failed, fails closed) | notice + action | Staff | none | `/not-authorized?why=unavailable` | Missing |
| F035 | MFA step-up API used by the Security page | action | All | MFA | `/api/auth/mfa` | Covered via `#/security` (see Security) |
## `/` Dashboard (Admin, Finance, Support, Viewer)

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F036 | Greeting (morning/afternoon/evening) and long date | notice | Not Sales | none | page | Covered: `#/today` heading |
| F037 | "Money figures as of HH:MM" + Refresh link | action | Not Sales | none | page | Missing |
| F038 | "Right now" live strip, numbers flash when they change, skeleton while loading | card | All | none | `admin_live_counters` | Partly: 4 static tiles on `#/today`; no live strip |
| F039 | Right now: Online now (+ how many can work) → People online | card | All | none | `admin_live_counters` | Missing |
| F040 | Right now: Getting quotes (+ quotes in last hour) → open jobs | card | All | none | `admin_live_counters` | Missing |
| F041 | Right now: Hired & in progress → active jobs | card | All | none | `admin_live_counters` | Missing |
| F042 | Right now: Overdue → overdue jobs | card | All | none | `admin_live_counters` | Missing (Tasks has an Overdue chip, no count tile) |
| F043 | Right now: Waiting for poster's OK → waiting jobs | card | All | none | `admin_live_counters` | Missing |
| F044 | Right now: Open disputes ("money frozen until you decide") → Disputes | card | Not Sales | none | `admin_live_counters` | Partly: inside "Problems" tile count |
| F045 | Right now: Help requests waiting → Help requests | card | All | none | `admin_live_counters` | Missing on Today (count only on Support tab) |
| F046 | Right now: Posted today (+ new people today) → jobs posted today | card | All | none | `admin_live_counters` | Covered: "Tasks posted today" tile (by city); new people today missing |
| F047 | "Needs you now" card: top 6 items, icon, kind, sub line, promise pill (late / due soon), "waiting X", Open, "See all N" | list | All | none | `needs-you.ts`, live | Covered: "Needs you first" (top 3) with promise bar and Inbox link |
| F048 | Earnings tile: today + change vs yesterday + all-time total since first day + finished-job count; links Today's entries / All earnings | card | Not Sales | none | `getEarningsSeries`, `getAllTimeEarnings` | Partly: "Our earnings this month" tile on `#/money/overview`; no today, delta vs yesterday or all-time |
| F049 | Escrow tile: held now, job count, plain explanation of commission split, extra "hired jobs not paid yet" amount; link to escrow jobs | card | Not Sales | none | `getEscrowJobs` | Partly: "Money held for tasks" tile; unpaid-hired amount missing |
| F050 | Paid out tile: today count + amount, all-time count + amount; link to payout history | card | Not Sales | none | `getPayoutTotals` | Partly: "Paid to helpers today" only |
| F051 | Withdrawals on the way tile: amount, count, how many need you | card | Not Sales | none | `getPayoutQueue` | Partly: list on `#/money/payouts`, no total tile |
| F052 | Stat: Jobs finished today → list | card | All | none | `getTodayCounts` | Missing |
| F053 | Stat: Jobs posted today → list | card | All | none | `getTodayCounts` | Covered: tile on `#/today` |
| F054 | Stat: New people today → list | card | All | none | `getTodayCounts` | Partly: only on the Sales Today ("Signups today") |
| F055 | Stat: Workers available now (older setting, with hint) → list | card | All | none | `getTodayCounts` | Missing |
| F056 | Stat: Waiting for poster's OK → list | card | All | none | `getTodayCounts` | Missing |
| F057 | "What TaskDrop earned" line chart: total, previous period dashed for compare, sum + delta | chart | Not Sales | none | `admin_earnings_daily`, `earningsChart` | Partly: 14-day bar chart on `#/money/overview`; no compare line or delta |
| F058 | Earnings range tabs: 7 days, This month, Last month, 3 months, 1 year, 5 years, All time | filter | Not Sales | none | `RANGES` | Missing |
| F059 | "Where today's money came from": Commission, Service fee, Promotions, Corrections, each with bar and link to its entries | chart | Not Sales | none | `getEarningsSeries` | Missing |
| F060 | Live feed: plain sentences, newest first, each opens the job/person/payout/help request | list | All | none | `admin_live_events`, `describeLive` | Partly: static "Live now" card on `#/today` |
| F061 | Live feed filters: Everything, Jobs, Money (not Sales), People, Help & safety | filter | All | none | `LIVE_GROUPS` | Missing |
| F062 | Live feed Pause / Resume (counts held lines) | action | All | none | `LiveProvider` | Missing |
| F063 | System health card: nightly check (internal) and (Razorpay) with checked count, Never ran / Too old / differences / All fine | card | Not Sales | none | `getSystemHealth` | Partly: "Health" card on `#/today` (money check line only) |
| F064 | System health card: money check needs a look → /money/reconcile | card | Not Sales | none | `moneyHealthLine` | Covered: "Money check (02:30)" line |
| F065 | System health card: app service (app-config) ping with ms / error | card | Not Sales | none | `app-config` edge function | Partly: "App and server: Fine", no ms or error detail |
| F066 | System health card: Open Sentry link (or "Add SENTRY_PROJECT_URL") | action | Not Sales | none | env | Partly: Sentry crash count shown, no link |
| F067 | Devices and tools card: installs per platform, share on newest version; link All devices | card | Not Sales | none | `admin_devices_summary` | Covered on `#/devices` (not on Today) |
| F068 | Tools links: Sentry, Inngest, ImageKit dashboards (or "Add X to link it") | action | Not Sales | none | `toolLinks` env | Missing |
| F069 | "Things to do" card: withdrawals need you, disputes, refunds owed, help requests, each with Open/Decide/Review/Reply; All clear pill | list | Not Sales | none | page | Covered: replaced by `#/inbox` (design says so) |
| F070 | "Whose money is in TaskDrop's account": total, stack bar and 7 rows (own earnings, escrow, wallet balances ready, posters' wallet credits, clearing, withdrawals on the way, refunds owed), each linked | chart | Not Sales | none | `WhoseMoney`, `getMoneyHeld` | Missing: design shows "Where held money sits" by task stage only |
| F071 | Note when refunds owed can't be counted (server key missing) | notice | Not Sales | none | `getMoneyHeld` | Missing |
| F072 | "Latest money movements" table (8): when, what, job or person link, amount, status pill; "All entries" | list | Not Sales | none | `getLatestMovements` | Partly: `#/money/moves` table and Razorpay messages timeline |

## `/` Dashboard, Sales variant

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F073 | Sales dashboard with no company money read at all | notice | Sales | none | `SalesDashboardView` | Covered: Sales `#/today` |
| F074 | Right now live strip (without disputes) | card | Sales | none | `admin_live_counters` | Missing |
| F075 | Needs you now (top 6) | list | Sales | none | live | Partly: Sales Today has no inbox list; Inbox limited to help |
| F076 | Stats: jobs posted today, new people today, workers available now, waiting for OK, finished today | card | Sales | none | `getTodayCounts` | Partly: "Signups today" and "Help requests open" only |
| F077 | "Your work" links: Customer hub, Follow-ups & pipeline, Leads, People | list | Sales | none | static | Partly: "All follow-ups" link + follow-ups due table |
| F078 | Live feed (no money group) | list | Sales | none | `admin_live_events` | Missing |
## `/needs-you` Needs you now

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F079 | One live list of everything waiting on a person (withdrawals, refunds, disputes, help requests, copyright notices), most urgent first | list | All | none | `needs-you.ts`, `needs-you-data.ts`, live | Covered: `#/inbox` |
| F080 | Each row: icon, kind label, sub line, promise pill (late / due soon / ok), "waiting X", Open | list column | All | none | `describeSla` | Covered: `#/inbox` rows with promise bar |
| F081 | Promise rules: 24 h for withdrawals, refunds, help, copyright; 48 h for disputes | notice | All | none | `needs-you.ts` | Covered: wbar "of 24 h / 48 h promise" |
| F082 | Summary pill: All clear / N late / N due soon / N waiting | notice | All | none | live | Partly: counts per chip, no late / due-soon summary |
| F083 | Empty state "Nothing is waiting on you" | notice | All | none | page | Covered: "All clear" empty state |

## `/money` Earnings & escrow

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F084 | "How money moves through TaskDrop" 4-step explainer with live fee %, review days, commission %, clearing days | notice | Not Sales | none | `getMoneySettings` | Partly: one-line Plan B text in header and "How money flows" row |
| F085 | Figure: Earned today + change vs yesterday → Today's entries | card | Not Sales | none | `getEarningsSeries` | Missing |
| F086 | Figure: earned in chosen range + change vs previous period → entries | card | Not Sales | none | `getEarningsSeries` | Partly: "Our earnings this month" tile with % vs Oct |
| F087 | Figure: Earned in total, since first day, finished-job count → All entries | card | Not Sales | none | `getAllTimeEarnings` | Missing |
| F088 | "Where the earnings came from" table: Commission / Service fee / Promotions / Corrections × Today / range / In total, every cell links to entries; total row | list | Not Sales | none | `getEarningsSeries('all')` | Missing |
| F089 | "Earnings over time" line chart with comparison line | chart | Not Sales | none | `admin_earnings_daily` | Partly: 14-day bar chart, no compare |
| F090 | Chart view tabs: Total / By type (stacked commission, fee, promotions) | tab | Not Sales | none | `earningsChart` | Missing |
| F091 | Chart range tabs: 7 days, This month, Last month, 3 months, 1 year, 5 years, All time | filter | Not Sales | none | `RANGES` | Missing |
| F092 | Escrow notice "Is this TaskDrop's money? Not yet." | notice | Not Sales | none | static | Missing |
| F093 | Figure: Held right now (jobs paid for) → escrow jobs | card | Not Sales | none | `getEscrowJobs` | Covered: "Held for tasks now" |
| F094 | Figure: Releases in the next 24 hours (poster has not replied) → waiting jobs | card | Not Sales | none | `getEscrowJobs` | Partly: "Waiting to release" tile (different rule: done, next hourly run) |
| F095 | Figure: Hired, not paid for yet (count) → hired jobs | card | Not Sales | none | `getEscrowJobs` | Partly: "Unpaid tasks that expired" card on `#/money/moves` |
| F096 | Escrow jobs table: job, poster, worker, status pill, held amount / Not paid, "What happens next" (auto-release time, frozen for dispute, running late) | list | Not Sales | none | `getEscrowJobs` | Partly: "Where held money sits" bars by stage; no per-job table |
| F097 | "Who the money in the account belongs to" (same WhoseMoney block as Dashboard) | chart | Not Sales | none | `WhoseMoney` | Missing |
| F098 | "Latest earnings entries" (10): when, type pill, job, amount; All entries | list | Not Sales | none | `getLedger` | Partly: "All money entries" button only |

## `/money/entries` Earnings entries (not in the sidebar)

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F099 | Ledger list: every earning, one line each: when, type pill, job link, note, amount | list | Not Sales | none | `getLedger` (ledger table) | Missing: design links "All money entries" but shows no entries screen |
| F100 | When filter: Today, Last 7 days, This month, Last month, All time | filter | Not Sales | none | page | Missing |
| F101 | Type filter: All types, Commission, Service fee, Promotions, Corrections | filter | Not Sales | none | `LEDGER_KIND` | Missing |
| F102 | Page sum "N entries adding up to ₹X" | notice | Not Sales | none | page | Missing |
| F103 | Pages: Newest / Older (50 per page) | action | Not Sales | none | cursor | Missing |

## `/money/reconcile` Money check

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F104 | Nightly checks history (20): time, internal or Razorpay check, date span, how many checked, All fine / N differences | list | Not Sales | none | `getReconciliationRuns` (reconciliation runs) | Covered: `#/money/check` "Past checks" + "Last check" tile |
| F105 | Open a run to see each difference: Important / Check pill, linked job or payout, date, amount, detail; Razorpay payment lines | detail field | Not Sales | none | `ReconcileRuns.tsx` | Partly: "To explain" item for today only |
| F106 | Range tabs: Last 7 / 30 / 90 days | filter | Not Sales | none | page | Missing |
| F107 | Summary of 6 checks with OK or count: funded without paid payment, paid but not credited, payment never completed, withdrawal waiting too long, paid without transfer reference, finished with no commission | list | Not Sales | none | `admin_reconcile`, `RECONCILE_CHECKS` | Missing |
| F108 | "What to look at" table: problem (linked), subject, when, amount, detail | list | Not Sales | none | `getMoneyCheckRows` | Partly: "To explain" list |
| F109 | Empty "Everything adds up"; "not set up" and role-refusal notices | notice | Not Sales | none | page | Covered: `#/states` + tiles |
## `/payouts` Payouts (withdrawals)

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F110 | Search box "Find a person" (by name) + Clear search | search | Not Sales | none | page | Missing |
| F111 | Money-lock notice (needs authenticator) | notice | Not Sales | MFA | `MoneyLock` | Partly: lock icon/chip only |
| F112 | RazorpayX balance warnings: "Couldn't read the RazorpayX balance" / "RazorpayX is ₹X short, add at least ₹Y" | notice | Not Sales | none | `getRazorpayXState` (`razorpayx-payouts` balance) | Missing |
| F113 | Stat: Waiting for you (count, amount) | card | Not Sales | none | `admin_payout_queue` | Partly: inbox item count; no stat |
| F114 | Stat: On the way (count, amount) | card | Not Sales | none | `admin_payout_queue` | Missing |
| F115 | Stat: Paid today (amount, count) | card | Not Sales | none | `getPayoutTotals` | Missing on payouts (only "Paid to helpers today" on Today) |
| F116 | Stat: Ready to withdraw (earnings people can still ask for) → People with money | card | Not Sales | none | `admin_money_position` | Missing |
| F117 | "Needs you" table: person + Worker/Poster tag, asked when, pay to (UPI / bank + IFSC, copy button), amount, stage pill, Pay / Open | list | Not Sales (destinations masked for non-money roles) | none | `admin_payout_queue`, `payout-dest.ts` | Covered: `#/money/payouts` "Withdrawals waiting" (helper, amount, to, waiting) |
| F118 | Stage labels: Pay by hand, Waiting, You're paying, Locked N days: pay or give back, Sending to RazorpayX, No answer from RazorpayX, Waiting for money in RazorpayX, Waiting for approval in RazorpayX, Check, With the bank | list column | Not Sales | none | `PAYOUT_STAGE`, `manualPayLabel` | Missing |
| F119 | Copy UPI id / account number buttons in table | action | Finance, Admin | none | `CopyButton` | Missing |
| F120 | Check with RazorpayX (send waiting ones, re-check quiet ones; same key, never twice) | action | Admin, Finance | two-step + MFA | `razorpayx-payouts` `check-all` | Covered: "Check all with RazorpayX" (tier 2) |
| F121 | "On the way" table (sent, waiting for bank) | list | Not Sales | none | `admin_payout_queue` | Missing |
| F122 | "Came back" table, last 7 days: when, person, amount, why (bank sent it back / reason), Message button | list | Not Sales | none | `getSettledPayouts` | Missing |
| F123 | "Settled" history (30 days): when, person, amount, result (Paid / Paid by RazorpayX / Came back / Cancelled), reference or reason; summary paid in 30 days + all time | list | Not Sales | none | `getSettledPayouts`, `getPayoutTotals` | Missing |
| F124 | Settled filter tabs with counts: All, Paid, Came back, Cancelled | filter | Not Sales | none | page | Missing |
| F125 | Settled pages (25 per page) | action | Not Sales | none | `Pager` | Missing |
| F126 | "Withdrawal requests per day" area chart with total, range 7 / 30 / 90 days | chart | Not Sales | none | `getWithdrawalRequestsDaily` | Missing |
| F127 | Click a chart day to list who asked that day (time, person, amount, status), Close | detail field | Not Sales | none | `getWithdrawalRequestsOn` | Missing |
| F128 | "How withdrawals are paid" switch: Manual / RazorpayX (In use, Not set up, "Set up RazorpayX first") | action | Admin | two-step + MFA | `admin_set_payout_method` | Missing (design "How money flows" is the Plan B switch, not this) |
| F129 | Money position: In RazorpayX, Ready to withdraw, Still clearing, On the way, Held for people, TaskDrop's own; Full breakdown link | card | Not Sales | none | `admin_money_position`, RazorpayX balance | Missing |
| F130 | "How it works" 3-step explainer (collapsed) | notice | Not Sales | none | static | Partly: gold note "Only for older wallet balances" |

## `/payouts/[id]` One withdrawal

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F131 | Header: amount, status pill, person link + Worker/Poster tag, asked when, short ref | detail field | Not Sales | none | `getPayoutDetail` | Missing: design has no payout detail page |
| F132 | "You can look at this, not pay it" notice for non-money roles; account details masked | notice | Support, Viewer | none | `maskDestinationLabel` | Missing |
| F133 | "Couldn't load the payment details" notice (queue did not return it) | notice | Not Sales | none | page | Missing |
| F134 | Account changed since asking: notice + switch to pay the account on file now / the saved one | action | Admin, Finance | none | `payoutDestinations` | Missing |
| F135 | Step 1: UPI QR code (amount and note filled in), UPI id + amount with Copy, "Open it in your UPI app" link on phones | action | Admin, Finance | none | `UpiQr`, `upiLink` | Missing |
| F136 | Step 1 (bank): name, account, IFSC, amount, each with Copy | action | Admin, Finance | none | `CopyButton` | Missing |
| F137 | "Can't send yet" when no account on file | notice | Admin, Finance | none | `payout-dest.ts` | Missing |
| F138 | "I'm paying it now: stop X cancelling" (lock withdrawal) | action | Admin, Finance | two-step + MFA | `admin_mark_payout` (processing) | Missing |
| F139 | Step 2: record paid by UPI / by bank / another way, with reference (UTR) checked by pattern | action | Admin, Finance | two-step + MFA | `admin_mark_payout` (paid) | Covered: "Mark paid" with UTR field (`#/money/payouts`) |
| F140 | "Can't pay it?": put the money back in their earnings / "It didn't go through", with reason they see | action | Admin, Finance | two-step + MFA | `admin_mark_payout` (failed) | Partly: "Give back" on `#/money/payouts` with no reason field |
| F141 | With RazorpayX card: stage help text, Check with RazorpayX | action | Admin, Finance | two-step + MFA | `razorpayx-payouts` `check-all` | Partly: check-all on the list only |
| F142 | "Pay it by hand instead" (take it away from RazorpayX) | action | Admin, Finance | two-step + MFA | `admin_mark_payout` (processing) | Missing |
| F143 | Stuck: "Give ₹X back" (asks RazorpayX first) | action | Admin, Finance | two-step + MFA | `razorpayx-payouts` `give-back` | Partly: "Give back" exists, no RazorpayX-first step |
| F144 | Result notices: Sent (reference), Bank sent it back / Didn't go through (reason, message link), Cancelled by person | notice | Not Sales | none | page | Missing |
| F145 | Details: amount, status, asked for, last change, sent to, paid how, bank reference, reason, RazorpayX payout id, RazorpayX says, times sent, RazorpayX fee, withdrawal id + Copy | detail field | Not Sales | none | `getPayoutDetail` | Missing |
| F146 | Who asked: name, uses TaskDrop as, earnings left to withdraw, open their page | detail field | Not Sales | none | `getPayoutDetail` | Missing |
| F147 | Their other withdrawals list with status | list | Not Sales | none | `getPayoutDetail` | Missing |
## `/refunds` Refunds

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F148 | "This list needs the server key" notice when the service key is missing | notice | Not Sales | none | `getRefundsOwed` (service role) | Missing |
| F149 | How-it-works explainer (amount worked out by the database, 5-7 days) | notice | Not Sales | none | static | Partly: "5-7 days" in the confirm text |
| F150 | Card title "N refunds owed" + total owed, oldest first | list | Not Sales | none | `getRefundsOwed` | Partly: "Recent refunds" table (no owed total) |
| F151 | Columns: job, poster, paid, kept for worker (cancel fee), owed back, cancelled at | list column | Not Sales | none | `getRefundsOwed` | Partly: task, to, amount, status, date; no paid / kept-for-worker split |
| F152 | Razorpay payment id with Copy | list column | Not Sales | none | `CopyButton` | Missing |
| F153 | Send refund (amount fixed by the database; can't be undone) | action | Admin, Finance | two-step + MFA | `razorpay` edge function `refund-escrow`, `admin_log_event` | Covered: "Send refund" on `#/money/refunds` (design types task id, amount and reason) |
| F154 | Empty "Nothing owed" | notice | Not Sales | none | page | Covered: `#/states` |

## `/disputes` Disputes (read-only list)

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F155 | How-it-works explainer (pay worker / refund poster) | notice | Not Sales | none | static | Partly: decision card explains each choice |
| F156 | Title "N open disputes" + total frozen in escrow, oldest first, "showing X of Y" | list | Not Sales | none | `getDisputes`, `countDisputes` | Partly: Tasks "Disputes" chip and Inbox "Disputes" chip; no total frozen |
| F157 | Columns: job, poster, worker, reason given (+ who said it), frozen amount / Never paid, waiting time, Decide | list column | Not Sales | none | `getDisputes` | Partly: Inbox row shows parties, amount, waiting; reason only on task page |

## `/support` Help requests

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F158 | Status tabs: Waiting for a reply, Answered, Resolved, All | tab | All | none | `getTickets(status)` | Missing: design shows one list, no status tabs |
| F159 | "N conversations", showing X of Y | list | All | none | `countTickets` | Partly: count on the Help requests tab |
| F160 | Columns: subject, from (person link), about (category), status pill, last message time | list column | All | none | `support_tickets` | Partly: name, status/age pill, id, subject; no category column |

## `/support/[id]` One help request

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F161 | Header: subject, status pill, from (person link), category, page it was sent from, opened time | detail field | All | none | `getTicket` | Partly: id, from, app version; no category, page or opened time |
| F162 | Conversation thread (staff vs person, author, time) | detail field | All | none | `support_messages` | Covered: `#/support/H-2207` chat |
| F163 | Reply box "They get a notification in the app" (4,000 chars) | action | Admin, Support, Sales | none | `reply_support_ticket` | Covered: reply box + Send reply |
| F164 | Mark as resolved ("They can still write back") / "Already resolved" | action | Admin, Support, Sales | two-step | `resolve_support_ticket` | Covered: Resolve button |
| F165 | Read-only line for roles that may not answer | notice | Finance, Viewer | none | page | Covered: locked buttons per role |
## `/promotions` Promotions

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F166 | Figure: Showing now (promoted jobs count) | card | Not Sales | none | `getPromotions` | Partly: "Paid promotions running" list, no count |
| F167 | Figure: Paid for (latest N) → Promotion earnings entries | card | Not Sales | none | `getPromotions` | Partly: "This month: ₹X from promotions" |
| F168 | Latest promotions table (100): job, paid by, amount, length in days, status (Not paid yet / Showing now / Finished / Cancelled), run dates | list | Not Sales | none | `getPromotions` | Partly: task, area, paid, views → offers; no payer, length, status or dates |
| F169 | Stop a promotion with a reason the advertiser sees (unused part back to their wallet) | action | Admin, Finance | two-step + MFA | `admin_pause_promotion` | Partly: "Pause" on `#/growth/promotions` (no reason field; design gives it to CRM roles) |

## `/reports` Business reports

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F170 | Period tabs: 7 days, 30 days, 90 days, 1 year | filter | Not Sales | none | page | Partly: select with Last 30 / Last 7 / This year |
| F171 | Money: Value of jobs finished (GMV) → finished jobs | card | Not Sales | none | `platform_stats` | Partly: "Money through TaskDrop" (paid by posters) |
| F172 | Money: TaskDrop earned in period → Earnings | card | Not Sales | none | `getEarnedSince` | Covered: "Our earnings" tile |
| F173 | Stat: Jobs posted → Jobs | card | Not Sales | none | `platform_stats` | Covered: "Tasks posted" tile |
| F174 | Stat: Jobs finished → finished jobs | card | Not Sales | none | `platform_stats` | Covered: "Tasks done" tile |
| F175 | Stat: Jobs cancelled → cancelled jobs | card | Not Sales | none | `platform_stats` | Missing |
| F176 | Stat: Getting quotes now → open jobs | card | Not Sales | none | `platform_stats` | Missing |
| F177 | Stat: Open disputes → disputed jobs | card | Not Sales | none | `platform_stats` | Missing |
| F178 | Stat: Quotes sent + share of jobs that got a quote | card | Not Sales | none | `platform_stats` | Missing |
| F179 | Stat: New people → list | card | Not Sales | none | `platform_stats` | Missing |
| F180 | Stat: People in total + active in period | card | Not Sales | none | `platform_stats` | Missing |
| F181 | Stat: Average worker rating | card | Not Sales | none | `platform_stats` | Missing |
| F182 | "How the business is doing": Paid in for jobs, TaskDrop earned, Take rate, Jobs finished, New people, Jobs posted, each with change vs the days before | card | Not Sales | none | `admin_business_daily` | Partly: 4 tiles, only "+18%" on tasks posted; no take rate |
| F183 | Line chart per day: paid in for jobs vs TaskDrop earned | chart | Not Sales | none | `admin_business_daily` | Missing |
| F184 | "Download as spreadsheet" CSV per day (new people, posted, finished, cancellations, disputes decided, paid in, wallet top-ups, earned) | export | Not Sales | none | `/api/reports/export` | Covered: "Download CSV" |
| F185 | Health of the marketplace: finish rate, cancel rate (+ count), disputes decided + rate, wallet top-ups (with before values) | card | Not Sales | none | `admin_business_daily` | Missing |
| F186 | "Do tasks get offers": time to first offer (typical + slowest 1 in 10), fill rate, got at least one offer | card | Not Sales | none | `admin_marketplace_numbers` | Partly: per-area "Filled" and "Time to first offer" columns only |
| F187 | Marketplace by category table: posted, got an offer, typical wait, slowest 1 in 10, filled | list | Not Sales | none | `admin_marketplace_numbers` | Missing |
| F188 | Marketplace by area table (top 15): same columns | list | Not Sales | none | `admin_marketplace_numbers` | Partly: "Marketplace by area" (posted, filled, time to first offer, helpers active) |
| F189 | Funnel "From joining to coming back": each step count, % of joined, % of step before | chart | Not Sales | none | `admin_funnel` | Covered: "From signup to first task" bars |
| F190 | Retention grid "Do people stay active?": sign-up week, people, same week to +8 weeks | chart | Not Sales | none | `admin_retention` | Partly: cohort table with 4 weeks, no people column |
| F191 | "What the promotions earned": started, running now, spent, views, taps, tap rate | card | Not Sales | none | `admin_promotion_roi` | Partly: per-promotion views → offers on `#/growth/promotions` |
| F192 | "Not set up" notices per block (migrations 094, 096, 141) | notice | Not Sales | none | `SetupNotice` | Covered: `#/states` "Not set up on this server yet" |

## `/search` Search

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F193 | Search page with box; empty hint "Type a job title or a person's name" | search | All | none | `/search` | Covered: instant search dropdown in top bar |
| F194 | Jobs results (10): title link + status pill; "All →" to Jobs with the query | list | All | none | `getTasks` | Covered: Tasks group in search results |
| F195 | People results (10): name link + wallet amount (hidden for Sales); "All →" to People | list | All | none | `getUsers` | Covered: People group (phone instead of wallet) |
## `/tasks` Jobs

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F196 | Search jobs by title (keeps the filter) | search | All | none | `getTasks` | Partly: top search finds tasks; no search box on the Tasks list |
| F197 | Filter tabs: All jobs, Money held, Getting quotes, Hired & in progress, Overdue, Waiting for poster's OK, Disputed, Finished, Cancelled, Posted today, Finished today | filter | All | none | `TASK_FILTERS` | Partly: chips All, Disputes, In progress, Waiting for offers, Overdue, Done; missing Money held, Waiting for OK, Cancelled, Posted today, Finished today |
| F198 | Count line + "₹X held in escrow for them" (Money held filter) + one-line meaning of the filter | notice | All | none | `getEscrowJobs` | Missing |
| F199 | Columns: job (title, category · place or posted date), poster, worker / Not hired, status pill with hint, price (agreed / budget), held now, last change | list column | All | none | `getTasks` | Partly: task (title, id, area), status, poster, helper, price, posted; no held-now or last-change, no agreed/budget label |
| F200 | Empty states: no match (clear the search) / nothing in this list | notice | All | none | page | Covered: `#/states` |
| F201 | Pages of 30 (jumps back to the last real page) | action | All | none | `Pager` | Missing |

## `/tasks/[id]` One job

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F202 | Header: title, status pill + plain hint | detail field | All | none | `getTask` | Covered: `#/task/TD-4821` header |
| F203 | Dispute notice "Why it was reported" with who and when (or "no reason recorded") | notice | All | none | `getDisputeReasons` | Covered: poster says / helper says notes |
| F204 | "This dispute has no money to decide over" (never paid, can only be cancelled) | notice | Not Sales | none | page | Missing |
| F205 | Decide dispute: "The work stands: pay worker" with amount after commission, clearing days, reason required | action | Admin, Finance | two-step + MFA | `admin_resolve_dispute` (worker) | Covered: "Release to helper" + reason (tier 3) |
| F206 | Decide dispute: "Refund poster" back to wallet incl. fee, job cancelled, reason required | action | Admin, Finance | two-step + MFA | `admin_resolve_dispute` (poster) | Covered: "Refund poster" |
| F207 | Money card: agreed price / budget, paid by poster (not yet), service fee, poster paid in total, worker gets, TaskDrop earned / will earn | detail field | Not Sales | none | `getTask`, `getMoneySettings` | Partly: held now, price, poster fee, commission; no "worker gets" or earned/will-earn |
| F208 | "Where the money is now" notice (not paid / held since / frozen / released + withdrawable date / refunded / owed via Refunds / back to wallet) | notice | Not Sales | none | page | Partly: status pill "Held" / "Frozen for dispute" |
| F209 | Razorpay payment id, status and refunded amount | detail field | Not Sales | none | `getTask` payment | Covered: Payment row (UPI · PAY id) |
| F210 | Sales sees only the price (no earnings, no payment) | detail field | Sales | none | `hideMoney` | Missing |
| F211 | "What the poster asked for": description text, category · place · kind | detail field | All | none | `getTask` | Partly: Task details (price, when, checklist, address); no description |
| F212 | Photos and files: job photo + worker proof, thumbnails open full size (signed, 2 h), video/file tiles, missing-photo reason, ImageKit not set up notice | detail field | All | none | `photos.ts`, `imagekit-sign.ts` | Partly: "Proof photos" tab only inside a dispute |
| F213 | Quotes table: worker (Chosen pill), price, message, sent | list | All | none | `getTask` quotes | Partly: "Offers" tab only inside a dispute |
| F214 | People card: poster and worker links | detail field | All | none | `getTask` | Covered |
| F215 | Visibility card: Hide this job (reason required) / Make visible again, shows why hidden | action | Admin, Support, Sales | two-step | `admin_hide_task`, `admin_unhide_task` | Partly: "Hide this task" with undo; no reason field, no "why hidden" line |
| F216 | Category card: Change category (free text, audit-logged) | action | Admin, Support, Sales | two-step | `admin_set_task_category` | Covered: "Change category" (tier 1) |
| F217 | Cancel and refund (open or locked job; reason the poster sees; wallet refund with no fine) | action | Admin, Finance | two-step + MFA | `admin_cancel_task_with_refund` | Partly: "Cancel with full refund" with no reason field |
| F218 | Timeline: posted, hired, paid into escrow, started, marked done, auto-release time, approved (or automatically), cancelled, worker can withdraw | detail field | All | none | `task-timeline.ts` | Covered: "What happened" timeline |
| F219 | TaskDrop's earnings from this job: ledger lines (type, time, amount) → entries | list | Not Sales | none | `getTask` ledger | Missing |
| F220 | Reviews: stars, author, about poster/worker, comment | list | All | none | `getTask` reviews | Missing |
| F221 | "Find similar jobs" link | action | All | none | `/tasks?q=` | Missing |
| F222 | Job id and "checked at" time | detail field | All | none | page | Partly: id in header |
## `/users` People

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F223 | Search by name or username (keeps filter and tag) | search | All | none | `getUsers` | Partly: top search only; no search box on the People list |
| F224 | Filter tabs: Everyone, Joined today, Online now, Available now, Workers, Money in wallet (not Sales), Admins, Suspended, Deleted | filter | All | none | `USER_FILTERS` | Partly: chips Everyone, Hire, Earn, Suspended, New accounts; missing Online now, Available now, Money in wallet, Admins, Deleted |
| F225 | Tag filter chips with people counts (Any + every tag) | filter | All | none | `getTags`, `idsWithTag` | Missing |
| F226 | Count line + one-line meaning of the filter | notice | All | none | page | Missing |
| F227 | "Download spreadsheet" CSV of the current view (name, does, place, joined, last seen, wallet + clearing for money roles, tags, suspended, owner, email + phone when allowed, id); every export audit-logged, 10 per minute | export | All (money columns not for Sales) | none | `/api/crm/export`, `admin_log_event` | Partly: CSV button; audit log, rate limit and per-role columns not shown |
| F228 | Columns: avatar + name + @username + place + tags | list column | All | none | `getUsers`, `getTagsFor` | Partly: name, area; no username or tags |
| F229 | Column "Does": Worker, Poster, Available now, Suspended (reason on hover), Deleted | list column | All | none | `getSuspendedAmong` | Covered: Side + Status pills |
| F230 | Column rating as worker and as poster with review counts | list column | All | none | `getUsers` | Partly: one rating number |
| F231 | Column wallet + clearing amount | list column | Not Sales | none | `getUsers` | Missing |
| F232 | Columns joined date and last seen | list column | All | none | `getUsers` | Missing (design shows phone and activity instead) |
| F233 | Pages of 30 | action | All | none | `Pager` | Missing |

## `/users/[id]` One person

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F234 | Header: initials, name, pills (Admin, Worker, Poster, Available now, Deleted, Suspended), tags, @username, place, joined, last seen | detail field | All | none | `getUser`, `getPersonCrm` | Partly: name, phone, area, joined, Hire/Earn/Suspended pills, tags; no Admin pill, username or last seen |
| F235 | Suspend (reason kept on record; signs them out; admins can't be suspended) | action | Admin, Support, Sales | two-step | `crm_suspend_user` | Partly: "Suspend until a date" (no reason field) |
| F236 | Suspended banner: reason, by whom, when + "Let X back in" with optional note | action | Admin, Support, Sales | two-step | `crm_unsuspend_user` | Missing: no unsuspend in design |
| F237 | Deleted-account banner: by whom / themselves, when, reason | notice | All | none | `getUser` deletion | Missing |
| F238 | Tabs: Overview, Money (not Sales), Follow-ups, Devices, Audit | tab | All | none | `USER_TABS` | Covered: Overview, Money, Tasks, Devices, Safety, Notes & follow-ups, History |
| F239 | Wallet card: ready to withdraw (→ withdrawals), still clearing with clearing days | card | Not Sales | none | `getUser` | Partly: "Old wallet balance" + "Paid to them, all time" |
| F240 | Manual wallet corrections list (reason, time, amount) | list | Not Sales | none | `wallet_adjustments` | Missing |
| F241 | Notes & follow-ups: add private note with optional follow-up date | action | Admin, Support, Sales | none | `crm_add_note` | Partly: "Add note" button (no date) |
| F242 | Notes list: author, time, follow-up date (due highlighted), pin/unpin, mark follow-up done/reopen, delete | list | Admin, Support, Sales | none | `crm_update_note`, `crm_delete_note` | Partly: notes shown as text; no pin, done or delete |
| F243 | Jobs they posted: job, status, price, posted | list | All | none | `getUser` | Covered: Tasks tab |
| F244 | Jobs they worked on: job, status, poster paid (not Sales), hired | list | All | none | `getUser` | Partly: one Tasks table (no hired date / poster paid) |
| F245 | Activity timeline: everything that happened to them, newest first, with links | list | All | none | `getTimeline` | Partly: Safety history + History tabs only |
| F246 | "Looked after by" owner picker (No owner / staff) | action | Admin, Support, Sales | none | `crm_assign_owner` | Missing |
| F247 | Tags card: list with remove ✕, add a tag with suggestions | action | Admin, Support, Sales | none | `crm_assign_tag`, `crm_remove_tag` | Partly: tags shown, no add/remove |
| F248 | Message card: send title + text to their notifications and phone push; "Sent to X" history (title, text, by, when) | action | Admin, Support, Sales | two-step | `crm_send_broadcast` (one person) | Partly: "Message" button with text box; no title, no sent history |
| F249 | Contact card: phone and email in full for Admin and Support (opening is audit-logged), masked for others; bio; "needs server key" note | detail field | All (full: Admin, Support) | none | `logContactView`, `contact-mask.ts` | Partly: masked phone + "viewed phone number" audit line; no email, no reveal rule |
| F250 | Ratings card: as worker / as poster with counts, list of reviews (stars, author, role, comment, job link) | list | All | none | `getUser` reviews | Partly: one rating tile |
| F251 | Withdrawals list: status, time, reference, reason, amount → payout page | list | Not Sales | none | `getUser` payouts | Partly: "withdrawal waiting" line in Money tab |
| F252 | Past suspensions: reason, by, when, lifted when/by, note | list | All | none | `getPersonCrm` | Partly: Safety history timeline |
| F253 | Delete account: shows blockers (admin, balance, clearing, payout on its way, active/funded jobs, working now, promotion, payment pending) or Delete with reason | action | Admin | two-step | `admin_delete_account` | Partly: "Delete account" with blocked note; no reason field |
| F254 | Person id | detail field | All | none | page | Missing |
| F255 | Money tab: at a glance (ready, clearing, paid in, withdrawn) | card | Not Sales | none | `getUserPayments` | Partly: Money tab (held, paid all time, payee account, old wallet) |
| F256 | Money tab: payments in, latest 50 (when, funding a job / wallet top-up, status, amount) | list | Not Sales | none | `getUserPayments` | Partly: small money table (released, commission) |
| F257 | Money tab: manual corrections | list | Not Sales | none | `getUser` | Missing |
| F258 | Follow-ups tab: list (title, owner, due, done by, detail) with Finish / Reopen | list | Admin, Support, Sales | none | `getUserFollowUps`, `crm_complete_task` | Partly: one static follow-up line |
| F259 | Follow-ups tab: add a follow-up (what, details, due date, give to staff) | action | Admin, Support, Sales | none | `crm_add_task` | Missing |
| F260 | Devices tab: sign-in methods + last signed in | detail field | All | none | `getUserSignIn` | Missing |
| F261 | Devices tab: Sign out everywhere (reason; not yourself) | action | Admin | two-step | `admin_sign_out_everywhere` | Covered: "Sign out everywhere" (design gives it to Support too) |
| F262 | Devices tab: installs list (platform, app version, OS, first seen, last active) | list | All | none | `getUserDevices` | Covered: "Devices and sign-ins" table |
| F263 | Audit tab: admin actions on this person (when, who, what, detail), latest 50 | list | All | none | `getUserAudit` | Covered: History tab |
## `/devices` Devices

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F264 | By platform (Web, Android, iPhone/iPad, Windows, Mac): installs, people, last seen, share on newest version, "N below the minimum" pill | card | All (refused roles see a notice) | none | `admin_devices_summary` | Partly: tiles Android, Web, Below lowest version, iOS; no people / last seen / share on newest |
| F265 | By app version table: platform, version, devices, people, last seen, Outdated / Latest | list | All | none | `admin_devices_summary`, `get_app_controls` | Partly: "Versions in use" bars (version + count) |
| F266 | Link "Set the minimum version" → settings controls | action | All | none | link | Covered: "Lowest allowed version" link to `#/settings` |
| F267 | Empty / not set up / not for your role states | notice | All | none | page | Covered: `#/states` |

## `/alerts` Alerts (team messages from background jobs)

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F268 | Tabs: Unread (count) / All | tab | All | none | `getAdminAlerts` | Missing |
| F269 | Alert list: title, kind pill (Withdrawal, Payout failed, Help request, Dispute, Daily digest), body, time, read | list | All | none | `admin_alerts` table | Partly: Inbox shows waiting items; no alert history list |
| F270 | Daily digest alert text | notice | All | none | Inngest `daily-digest` | Missing (design lists the job on Health only) |
| F271 | Mark one alert read | action | All except Viewer | two-step | `admin_alerts.read_at` (`markAlertsRead`) | Missing |
| F272 | Mark all as read (team-wide) | action | All except Viewer | two-step | `markAlertsRead('all')` | Missing |

## `/reports-queue` Reports (flagged content)

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F273 | Tabs: Open / Handled | tab | All | none | `getReports(view)` | Partly: open list only; no Handled history |
| F274 | Report card: kind pill (Person, Job, Message, Review), linked target, reported by, when, status pill (Hidden / Acted on / Dismissed), reason quote | list | All | none | `getReports` | Covered: `#/safety/reports` rows |
| F275 | Reported message text (+ "hidden from the chat") | detail field | All | none | `getReports` | Covered |
| F276 | Hide this message (reason) / Show it in the chat again | action | Admin, Support, Sales | two-step | `admin_hide_message`, `admin_unhide_message` | Partly: "Hide" with undo toast; no reason, no show-again later |
| F277 | Reported review (stars + comment, "removed, not counted") | detail field | All | none | `getReports` | Covered: Review row |
| F278 | Remove this review (reason; rating re-worked) / Put the review back | action | Admin, Support, Sales | two-step | `admin_hide_review`, `admin_unhide_review` | Partly: "Hide" covers remove; no put-back, no reason |
| F279 | Warn them (person reports; text they read; closes report) | action | Admin, Support, Sales | two-step | `admin_warn_user` | Partly: "Warn" without message text |
| F280 | Mark acted on (optional note) | action | Admin, Support, Sales | two-step | `admin_resolve_report` (actioned) | Missing |
| F281 | Dismiss (optional note; reporter not told) | action | Admin, Support, Sales | two-step | `admin_resolve_report` (dismissed) | Covered: "No problem" |
| F282 | Handled: by whom + resolution note | detail field | All | none | `getReports` | Missing |
| F283 | View-only line for roles that can't act | notice | Finance, Viewer | none | page | Covered: locked buttons |
## `/copyright` Copyright notices

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F284 | "Not switched on yet" (copyright tables missing) | notice | All | none | `getCopyrightNotices` | Covered: `#/states` not set up |
| F285 | Log a notice form: who sent it, their email, their work, where it is (their words), the job link/id, or the person link/id | action | Admin, Support, Sales | none | `admin_log_copyright_notice` | Missing |
| F286 | "What the law expects" explainer (six parts, take down fast, counter-notice, 10-14 business days, repeat infringers at 3) | notice | All | none | static | Missing |
| F287 | Three tables: Waiting for a decision, Taken down, Closed | list | All | none | `getCopyrightNotices` | Partly: one "Copyright notices" table with stage pill |
| F288 | Notice column: complainant, email, work, received ago | list column | All | none | `copyright.ts` | Partly: complainant + short description |
| F289 | On TaskDrop column: job link, uploader link, material text, photo thumbnail | list column | All | none | `copyright.ts`, `PhotoStrip` | Partly: "About" (e.g. "TD-4799 photo") |
| F290 | Upheld-notice count per uploader; red "repeat infringer" pill at 3 (suspend from People page) | list column | All | none | `copyright.ts` strikes | Missing |
| F291 | Status pill (Waiting, Taken down, Counter-notice, Rejected, Restored) + what was removed + restore-from date + note | list column | All | none | `copyright.ts` | Partly: stage pill with promise hours |
| F292 | Take down the job's photo or video (note) | action | Admin, Support, Sales | two-step | `admin_copyright_takedown` (media) | Partly: one "Take down" button |
| F293 | Close the whole post (note) | action | Admin, Support, Sales | two-step | `admin_copyright_takedown` (listing) | Missing |
| F294 | Take down their profile photo (note) | action | Admin, Support, Sales | two-step | `admin_copyright_takedown` (avatar) | Partly: generic "Take down" |
| F295 | Reject (reason required) | action | Admin, Support, Sales | two-step | `admin_copyright_reject` | Covered: "Reject" (no reason field) |
| F296 | Record "Counter-notice received" (note) | action | Admin, Support, Sales | two-step | `admin_copyright_counter` | Missing: only shown as a stage |
| F297 | "Wait until <date>" before restore | notice | All | none | page | Missing |
| F298 | Restore | action | Admin, Support, Sales | two-step | `admin_copyright_restore` | Covered: "Restore" |
| F299 | View-only card for roles that can't act | notice | Finance, Viewer | none | page | Covered: locked buttons |

## `/feedback` Feedback board

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F300 | Tabs with counts: New, Under review, Planned, In progress, Done, Not planned, Hidden | tab | All | none | `getBoardPosts`, `getBoardCounts` | Partly: chips Top voted, New, Planned, Done (no counts, no Under review / In progress / Not planned / Hidden) |
| F301 | Tab: Private notes (what people send with "Send feedback": kind, author, when, page, text, photos/PDFs) | tab | All | none | `getPrivateNotes` | Missing |
| F302 | Idea card: title, kind, author, when, votes, status or Hidden pill, text, hide reason | list | All | none | `feedback.ts` | Partly: votes, title, comment and photo counts, status pill |
| F303 | Idea photos/files (open full size) | detail field | All | none | `PhotoStrip` | Partly: "2 photos attached" count only |
| F304 | Comments (expand): author, when, Hidden pill | list | All | none | `feedback.ts` | Partly: comment count only |
| F305 | Hide comment / Show it again | action | Admin, Support, Sales | two-step | `admin_feedback_hide_comment` | Missing |
| F306 | Set status (New, Under review, Planned, In progress, Done, Not planned) + public note; notifies author and voters | action | Admin, Support, Sales | two-step | `admin_feedback_set_status` | Partly: "Change status" select (Planned, Done, Not now), no note |
| F307 | Reply as the TaskDrop team (author notified) | action | Admin, Support, Sales | two-step | `admin_feedback_reply` | Covered: "Reply" |
| F308 | Hide idea (reason) / Put it back on the board | action | Admin, Support, Sales | two-step | `admin_feedback_hide` | Missing |
| F309 | View-only line | notice | Finance, Viewer | none | page | Covered: disabled status select |
## `/catalog` Skills & categories

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F310 | Kind tabs: Skills / Categories | tab | All | none | `getCatalog(kind)` | Partly: `#/safety/skills` covers skills only; no Categories |
| F311 | Filter tabs with counts: All, Added by workers, New this week, Hidden | filter | All | none | `catalog-calc.ts` | Partly: one list "New skills people added" |
| F312 | Ranked table: rank, name (+ Hidden pill), workers / tasks count, came from (Built in / Added by X on date), also matches (phrases) | list | All | none | `getCatalog` | Partly: skill typed, used by, looks like; no rank, source or phrases |
| F313 | Rename (audit-logged, changes every profile and job) | action | Admin, Support, Sales | two-step | `admin_catalog_rename` | Missing |
| F314 | Add phrase (synonym that points to this term) | action | Admin, Support, Sales | two-step | `admin_catalog_add_phrase` | Missing |
| F315 | Remove a phrase (× button) | action | Admin, Support, Sales | two-step | `admin_catalog_remove_phrase` | Missing |
| F316 | Merge into… (pick the target term) | action | Admin, Support, Sales | two-step | `admin_catalog_merge` | Covered: "Merge" (target suggested, not picked) |
| F317 | Hide / Unhide a worker-added term | action | Admin, Support, Sales | two-step | `admin_catalog_set_hidden` | Partly: "Hide" for junk; no Unhide |
## `/crm` Customer hub

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F318 | Header shortcuts: My customers, Leads, Segments, Send a message | action | All | none | links | Partly: Growth tabs (no hub page, no "My customers") |
| F319 | Stat: People (total) | card | All | none | `getCrmOverview` | Missing |
| F320 | Stat: Suspended (count) → suspended people | card | All | none | `getCrmOverview` | Missing |
| F321 | Stat: Follow-ups waiting (+ due now) | card | All | none | `getCrmOverview` | Partly: Sales Today "Follow-ups due today" tile |
| F322 | Stat: Messages sent (total) | card | All | none | `getCrmOverview` | Missing |
| F323 | "What you can do here" explainer | notice | All | none | static | Missing |
| F324 | Follow-ups from notes: person, note text, Due / Coming up + date, Done button | list | Admin, Support, Sales (Done) | none | `crm_update_note` | Partly: "Follow-ups due" table (who, why, due), no Done |
| F325 | Recent notes (with total count) | list | All | none | `getCrmOverview` | Missing |
| F326 | Latest messages: title + text, sent to, people, when, by; All messages | list | All | none | `crm_broadcasts` | Partly: "Last sends" (date, to, opened %) |
| F327 | Suspended list: person, reason, date | list | All | none | `getCrmOverview` | Partly: People "Suspended" chip only |
| F328 | Tags list with people counts, click to filter | list | All | none | `getTags` | Missing |
| F329 | Delete a tag (taken off N people) | action | Admin, Support, Sales | two-step | `crm_delete_tag` | Missing |

## `/crm/tasks` Follow-ups & pipeline

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F330 | Customer pipeline: Signed up, Engaged, Funded, Completed one, Repeat; count, share of everyone, "at risk" (not seen 30 days) | chart | All | none | `getPipeline` | Missing |
| F331 | Tabs: Mine, Everyone's open, Done | tab | All | none | `getFollowUps(view)` | Missing |
| F332 | Table: what (detail, "Automatic" pill), about (person link), due (red Overdue) or done date, owner or done by | list | All | none | `crm_tasks` | Partly: "Follow-ups due" (who, why, due) |
| F333 | Finish / Reopen a follow-up | action | Admin, Support, Sales | none | `crm_complete_task` | Missing |
| F334 | Add a follow-up: what, details, due date, give to (staff) | action | Admin, Support, Sales | none | `crm_add_task` | Partly: "Add" button (tier 1), no form |

## `/crm/leads` Leads

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F335 | Download leads CSV (name, kind, stage, contact, source, owner, note, added, stage since, added by, in the app, id) | export | All | none | `/api/crm/leads/export` | Missing |
| F336 | "How leads work" explainer | notice | All | none | static | Missing |
| F337 | Stage tabs with counts: All, New, Contacted, Talking, Won, Lost | filter | All | none | `LEAD_STAGES` | Missing |
| F338 | Owner tabs: Anyone's, My leads, No owner, pick a staff member | filter | All | none | `parseLeadFilter` | Missing |
| F339 | Lead row: name, kind pill (Business/Person/Other), stage pill, link to their app account, contact, source, added when/by, stage since, owner, note | list | All | none | `getLeads` | Partly: name, from, stage |
| F340 | Edit a lead: stage, looked after by, note | action | Admin, Support, Sales | none | `crm_update_lead` | Missing |
| F341 | Add a lead: name, contact, kind, where found, note, looked after by | action | Admin, Support, Sales | none | `crm_add_lead` | Missing |

## `/crm/segments` Segments

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F342 | Owner tabs: Everyone's customers, My customers, No owner, a staff member's | filter | All | none | `parseOwnerFilter` | Missing |
| F343 | Find people filters: who (everyone / workers / only post), joined within N days, not seen for N days, has tag, wallet at least ₹ (not Sales), platform, app older than version, looked after by, never posted, available now, include suspended | filter | All (wallet filter not Sales) | none | `parseCriteria`, `getMembers` | Missing: "New group" opens a demo toast only |
| F344 | Result count + plain description of the filters | notice | All | none | `describeCriteria` | Missing |
| F345 | "Message them" → Messages with these filters | action | All | none | link | Covered: "Message them" on saved groups |
| F346 | Download spreadsheet of the matches | export | All | none | `/api/crm/export?segment=1` | Missing |
| F347 | Matches table: tick box, name, does, wallet (not Sales), joined, last seen, owner; pages of 30 | list | All | none | `getMembers` | Missing |
| F348 | Tick people (or all on page) and set who looks after them | action | Admin, Support, Sales | none | `crm_assign_owner` | Missing |
| F349 | Save these filters as a segment (name) | action | Admin, Support, Sales | none | `crm_save_segment` | Partly: "New group" button |
| F350 | Saved segments: name, description, live people count, saved date, open | list | All (wallet segments hidden from Sales) | none | `getSegments` | Covered: "Saved groups of people" (adds test-people count) |
| F351 | Delete a saved segment | action | Admin, Support, Sales | two-step | `crm_delete_segment` | Missing |

## `/crm/messages` Messages (broadcast)

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F352 | Send to: grouped picker with live counts (your filters from Segments, Everyone, All workers, People who post…, each saved segment, each tag) | filter | Admin, Support, Sales | none | `getAudiences` | Partly: "Who" select of saved groups only |
| F353 | Title (80) and message (500) | action | Admin, Support, Sales | none | `BroadcastForm` | Covered |
| F354 | Review and send → "Send this to N people?" (Enter never sends); max 5,000; suspended left out | action | Admin, Support, Sales | two-step | `crm_send_broadcast` | Covered: send with count + tier 3 confirm |
| F355 | Repeat-send protection (same text in 2 min) and per-staff rate limit | notice | Admin, Support, Sales | none | `broadcastDuplicate`, `actionLimit` | Missing |
| F356 | "Good to know" (count shown first, 5,000 cap, suspended left out, can't take back) | notice | All | none | static | Covered: blue note + confirm text |
| F357 | "Sent so far" history (30): title + text, sent to, people, when, by | list | All | none | `getBroadcasts` | Partly: "Last sends" (date, to, opened %) |

## `/team/performance` Team performance

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F358 | Range tabs: Last 7 / 30 / 90 days | filter | All | none | page | Partly: follows the Reports period select |
| F359 | Per staff: name + role, follow-ups done, on time %, open / overdue, notes, help replies, first reply time, reports handled, disputes decided, customers owned | list | All | none | `admin_staff_performance` | Partly: "Staff performance" card in `#/reports` (answered, avg first reply) |
## `/settings/*` Admin & configuration (shared)

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F360 | One "Admin & configuration" page with 9 tabs: Team & access, Money & timing, App switches, Rules, Web/Android/iOS, Integrations, System health, Audit log, My security | tab | Not Sales (Security: all) | none | `ConfigHeader` | Covered: Settings group (App switches, Content, Team & access, System health, Audit log, Launch checklist, My security) + Money > Fees |

## `/settings/team` Team & access

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F361 | Figure: team size by role | card | Not Sales | none | `getTeam` | Missing |
| F362 | Figure: authenticator set up "X of N" | card | Not Sales | none | `getTeam` (service key) | Partly: per-person Authenticator column |
| F363 | Figure: panel sign-in mode (Allowlist with N accounts / Role only) | card | Not Sales | none | `adminAllowlist` | Missing |
| F364 | Notice: emails, last sign-in and authenticator hidden without the service key | notice | Not Sales | none | `hasServiceKey` | Missing |
| F365 | "You are <role>: only a full Admin can change the team" (team readable by all non-Sales) | notice | Finance, Support, Viewer | none | page | Partly: design locks the whole Team page for non-Admin |
| F366 | End all staff sessions (reason; yours stays) | action | Admin | two-step | `admin_end_all_staff_sessions` | Covered: "Sign out all staff" |
| F367 | Add admin: @username or Google address + role (must already have an account) | action | Admin | two-step + MFA | `admin_set_admin`, `admin_set_staff` | Covered: "Add a person" (email + role) |
| F368 | Team table: name, signs in with, role badge, alerts, panel access (gold pill when not on the allowlist), authenticator, last signed in, actions | list | Not Sales | none | `getTeam` | Partly: person + email, role, authenticator, last seen; no signs-in-with, alerts or allowlist columns |
| F369 | Change a staff role (dropdown + Save; not your own; one Admin must remain) | action | Admin | MFA | `admin_set_staff` | Covered: "Change role" (tier 3) |
| F370 | Staff alerts on/off per person (own: anyone; others: Admin) | action | All (own), Admin (others) | none (MFA for others) | `admin_set_staff` notify | Missing |
| F371 | Remove admin access | action | Admin | two-step + MFA | `admin_set_admin` | Covered: "Remove" |
| F372 | "What each role can do" table (roles x Money / People / Admin areas) + alerts note | list | Not Sales | none | `STAFF_ROLES`, `AREA_LABEL` | Covered: "What each role can do" |

## `/settings` Money & timing

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F373 | Gold notice "These change the app for everyone, straight away" | notice | Not Sales | none | static | Partly: "Applies to new tasks only" text in the change dialog |
| F374 | Each setting shows label, help, current value and "Last changed" time | detail field | Not Sales | none | `getAllSettings` | Partly: label, help and value; no last-changed time |
| F375 | Commission TaskDrop keeps (read-only here, change by migration) | detail field | Not Sales | none | `worker_commission_pct` | Covered: "Helper commission" (design makes it editable) |
| F376 | Service fee posters pay % | action | Admin | two-step + MFA | `updateSetting` `poster_service_fee_pct` | Covered: "Poster fee" |
| F377 | Paid to the worker if a started job is cancelled % | action | Admin | two-step + MFA | `post_start_cancel_penalty_pct` | Covered: "Cancel fine" |
| F378 | Days a poster has to approve (auto-release) | action | Admin | two-step + MFA | `review_window_days` | Missing |
| F379 | Days before a worker can withdraw (clearing) | action | Admin | two-step + MFA | `clearing_period_days` | Covered: "Days before payout clears" |
| F380 | Longest video on a job post (seconds) | action | Admin | two-step + MFA | `max_video_seconds` | Missing |
| F381 | Sign-in codes a day (SMS cap; alert at 80% and 100%) | action | Admin | two-step + MFA | `sms_daily_cap` | Covered: Limits "SMS codes per day (all)" |
| F382 | Biggest job a new account can post (rupees) | action | Admin | two-step + MFA | `new_account_max_task_minor` | Covered: "Largest task for new accounts" |
| F383 | Most a new account can withdraw in a day (rupees) | action | Admin | two-step + MFA | `new_account_max_withdraw_day_minor` | Missing |
| F384 | Days an account counts as new | action | Admin | two-step + MFA | `new_account_days` | Covered: "New-account days" |
| F385 | Finished jobs that end "new" | action | Admin | two-step + MFA | `new_account_tasks` | Missing |
| F386 | Promotion daily budgets (rupee list) | action | Admin | two-step + MFA | `promotion_daily_budgets_minor` | Missing |
| F387 | Promotion lengths (days list) | action | Admin | two-step + MFA | `promotion_durations_days` | Missing |
| F388 | Developer sign-in shown read-only (changed on App switches) | detail field | Not Sales | none | `dev_otp_for_all` | Covered on `#/settings` |
| F389 | "Advanced (ads pricing and others)": every other setting key with a readable value, read-only | list | Not Sales | none | `readableSetting` | Partly: "3 old unused settings are hidden" |

## `/settings/switches` App switches

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F390 | Red notice "Developer sign-in is ON" | notice | Not Sales | none | `getSwitches` | Covered: launch-blocker bar |
| F391 | Guard: "Do not turn on the authenticator code yet" (some staff have none; refuses if you have none) | notice | Not Sales | none | `mfaSwitchCheck` | Missing |
| F392 | Switch: Authenticator code for money actions (danger when off; "Set up your authenticator first") | action | Admin | two-step + MFA | `setSwitch` `admin_require_mfa` | Covered: "Staff need an authenticator code..." |
| F393 | Switch: Developer sign-in `dev_otp_for_all` (type ON to turn on) | action | Admin | two-step + MFA | `setSwitch` `dev_otp_for_all` | Covered: "Sign in without a real code" (type a word) |
| F394 | Last changed time per switch | detail field | Not Sales | none | `getSwitches` | Missing |
| F395 | "How withdrawals are paid" shown, with a link to change it on Payouts | detail field | Not Sales | none | `getPayoutMethod` | Missing |
| F396 | Read-only view for non-Admin | notice | Finance, Support, Viewer | none | page | Covered: "You can look but not change" |

## `/settings/controls` Web, Android & iOS (kill switches)

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F397 | "How these work" notice (Everywhere vs one platform; apps re-check about once a minute) | notice | Not Sales | none | static | Missing |
| F398 | Columns per place: Everywhere, Web, Android, iPhone/iPad (a platform can only add restrictions) | list column | Not Sales | none | `get_app_controls` | Missing: design switches are one global value each |
| F399 | Each switch change asks "Why" (reason) | action | Admin (money ones: Admin, Finance) | two-step | `admin_set_app_control` | Missing |
| F400 | Maintenance mode per place | action | Admin | two-step | `admin_set_app_control` `maintenance` | Partly: global "Maintenance mode" |
| F401 | Require a verified phone number per place ("On via Everywhere") | action | Admin | two-step | `require_phone_verified` | Partly: global "Phone must be checked before posting or offering" |
| F402 | New sign-ups per place | action | Admin | two-step | `signups_open` | Partly: global switch |
| F403 | Sign in with phone per place | action | Admin | two-step | `signin_phone` | Partly: global switch |
| F404 | Sign in with Google per place | action | Admin | two-step | `signin_google` | Partly: global switch |
| F405 | Sign in with Apple per place | action | Admin | two-step | `signin_apple` | Partly: global switch |
| F406 | Sign in with username and password per place | action | Admin | two-step | `signin_password` | Partly: global switch |
| F407 | Posting jobs per place | action | Admin | two-step | `posting` | Partly: global switch |
| F408 | Sending offers per place | action | Admin | two-step | `bidding` | Partly: global switch |
| F409 | Wallet top-ups per place (Money pill) | action | Admin, Finance | two-step + MFA | `topups` | Partly: global "Posters can top up a task price" |
| F410 | Withdrawals per place (Money pill) | action | Admin, Finance | two-step + MFA | `withdrawals` | Partly: global "Old wallet withdrawals" |
| F411 | Promoting jobs per place | action | Admin | two-step | `promotions` | Partly: global "Paid promotions" |
| F412 | Photos in chat per place | action | Admin | two-step | `chat_photos` | Partly: global switch |
| F413 | Per place: maintenance message text | action | Admin | none (Save) | `admin_set_app_control` text | Missing (design says "shows your message", no field) |
| F414 | Per place: oldest app version allowed | action | Admin | none (Save) | `min_version` | Partly: one "Lowest app version allowed" (tier 3) |
| F415 | Per place: update link (https) | action | Admin | none (Save) | `update_url` | Missing |
| F416 | Per place: banner text, look (Information / Warning / Serious), link, end date | action | Admin | none (Save) | `banner_text`, `banner_level`, `banner_link`, `banner_ends_at` | Partly: one global "Top banner" on `#/content` with preview |
| F417 | Devices card: installs by platform, active this week, need an update; by version with "Below the minimum"; latest report time | card | Not Sales | none | device rows | Partly: `#/devices` |

## `/settings/rules` Rules (CRM automation)

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F418 | "You can look, but not change" for non-Admin | notice | Finance, Support, Viewer | none | page | Covered: locked switches |
| F419 | Rule list: name, kind + plain description (e.g. paid in N days ago, nothing posted), On/Off pill | list | Not Sales | none | `getRules` | Partly: "Automatic follow-ups" rows (different example rules) |
| F420 | Turn a rule on/off | action | Admin | two-step | `admin_save_crm_rule` | Covered: toggle (design lets CRM roles do it) |
| F421 | Edit a rule (name, when, days) | action | Admin | none | `admin_save_crm_rule` | Missing |
| F422 | Delete a rule | action | Admin | two-step | `admin_delete_crm_rule` | Missing |
| F423 | Add a rule: name, when (Paid in then nothing posted / Dispute opened), days 1-90; starts off | action | Admin | none | `admin_save_crm_rule` | Missing |
| F424 | Latest automation follow-ups (10): title, Open / Done | list | Not Sales | none | `getRules` | Missing |

## `/settings/integrations` Integrations (read-only)

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F425 | Supabase: Connected / Not reachable, project ref, answered in ms | card | Not Sales | none | `getIntegrations` | Missing |
| F426 | Service key: Set / Missing + how to add it | card | Not Sales | none | env | Missing |
| F427 | Panel sign-in: allowlist on / role only, allowed accounts (masked for non Admin/Support), idle minutes | card | Not Sales | none | `adminAllowlist` | Partly: idle setting row only |
| F428 | RazorpayX payouts: Not set up / Error / Connected, how withdrawals are paid, balance | card | Not Sales | none | `getRazorpayXState` | Partly: "Connected services: Razorpay" pill |
| F429 | Razorpay payments: Receiving / No payments yet, last payment time | card | Not Sales | none | `getIntegrations` | Partly: Razorpay pill only |
| F430 | Push notifications: Active / No devices, phones registered | card | Not Sales | none | `getIntegrations` | Partly: "Push notifications: Working" |
| F431 | Note: keys and secrets are never shown; where to change them | notice | Not Sales | none | static | Missing |

## `/settings/health` System health

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F432 | "Check again" button | action | Not Sales | none | page reload | Missing |
| F433 | Summary notice: N checks failing / money check needs a look / Everything is working (checked time) | notice | Not Sales | none | `getHealth` | Partly: page subtitle only |
| F434 | Checks list with ms or failing detail: Database, Money ledger, Earnings totals, Payout queue, RazorpayX money position, Customer hub, Copyright notices, Account deletion, Audit log | list | Not Sales | none | `getHealth` | Missing: design shows background jobs and quotas instead |
| F435 | "Waiting for you": payouts, disputes, refunds, help requests counts with links | card | Not Sales | none | `getHealth` queues | Covered: Inbox |
| F436 | Latest activity: money moved, job posted, person joined, help request (time ago, links) | card | Not Sales | none | `getHealth` latest | Missing |
| F437 | This server: environment, version (commit), region, Node version | card | Not Sales | none | `getHealth` runtime | Missing |

## `/settings/audit` Audit log

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F438 | Area filter: Everything, Settings, Admin access, Payouts, Wallet changes, Dispute decisions, Suspensions, Messages sent, Copyright, Staff actions | filter | Not Sales | none | `AUDIT_TABLES` | Partly: kind select All, Money, Switches, Safety, Privacy |
| F439 | Lines filter: Without heartbeats, Staff only, Every line | filter | Not Sales | none | `asAuditScope` | Partly: "Who" select (Everyone, each staff member, System) |
| F440 | Rows: when, who (link), area badge, plain "what happened" (linked), about person / job / record, extra detail | list | Not Sales | none | `getAuditLog` (`admin_audit_log`) | Covered: plain-words audit list |
| F441 | Before / after (raw JSON) | detail field | Not Sales | none | `getAuditLog` | Covered: "Details" with before and after |
| F442 | Pages of 40 | action | Not Sales | none | `Pager` | Missing |

## `/security` My security

| ID | What the owner sees or does | Kind | Roles | Confirm | Backend | Design status |
|---|---|---|---|---|---|---|
| F443 | Notice "Money actions are locked for this session" | notice | All | none | `mfaState` | Covered: top-bar chip |
| F444 | Set up authenticator: QR code, manual key, type the 6-digit code | action | All | MFA | `/api/auth/mfa`, Supabase MFA enroll | Partly: "Set up a new phone" button; no QR or key screen |
| F445 | Enter a code to unlock money actions for this session | action | All | MFA | `/api/auth/mfa` verify | Covered: "Unlock money actions" dialog |
| F446 | Note when the requirement is switched off | notice | All | none | `mfaState` | Missing |

## v2 checklist (design v2, 28 Nov 2026)

Status of every F-ID in `design/admin-design-v2.html`. **done** = shown in v2 (route given). Every stub page was filled on 28 Nov; no stub is left. Details: `06-design-v2-notes.md`.

**Totals: 446 done, 0 stub, 0 left out (446/446).**

| F-IDs | Page | v2 status | Notes |
|---|---|---|---|
| F001–F027 | Shell | done (every page) | F003 per-item badges; F008 Live chip; F009 alert states; F015 Sign out in account menu; F016 "(N)" tab title; F017 simulated live tick; F018 `#/login?why=idle` + 30 vs 90 note; F020–F024, F027 on `#/states`. F011 and F026 shown as **Off for now** (no authenticator); F025 is now confirm / type-a-word, never a code |
| F028–F035 | Sign-in and access | done (`#/login`, `#/not-authorized`, `?why=unavailable`) | F035 shown as Off for now on `#/security` |
| F036–F072 | Dashboard | done (`#/`) | F069 links into Needs you; F071 note under "Whose money" |
| F073–F078 | Dashboard, Sales | done (`#/` as Sales) | |
| F079–F083 | Needs you | done (`#/needs-you`) | + kind filters (New) |
| F084–F098 | Earnings & escrow | done (`#/money`) | + Pay per task moves / retry (New) |
| F099–F103 | Earnings entries | done (`#/money/entries`) | |
| F104–F109 | Money check | done (`#/money/reconcile`) | F109 empty in-page, "not set up" on `#/states` |
| F110–F130 | Payouts | done (`#/payouts`) | F111 shown as Off for now; F112 banner + `#/states` |
| F131–F147 | One withdrawal | done (`#/payouts/w-1001`, `w-1002` bank, `w-1003` changed account, `w-1004` no account, `w-0985`/`w-0990`/`w-0980` results, `w-0970` RazorpayX example) | F133 on `#/states` |
| F148–F154 | Refunds | done (`#/refunds`) | F148 on `#/states` |
| F155–F157 | Disputes | done (`#/disputes`) | |
| F158–F160 | Help requests | done (`#/support`) | tabs ?status=waiting|answered|resolved|all |
| F161–F165 | One help request | done (`#/support/:id`) | `#/support/h-301`, `h-306` answered; F165 view-only line for Finance, Viewer |
| F166–F169 | Promotions | done (`#/promotions`) | F169 Stop is type-to-confirm (STOP), Admin + Finance; owner decision note on stop vs no refund |
| F170–F192 | Business reports | done (`#/reports`) | F185 Wallet top-ups card marked Not used since Plan B; F192 "not set up" note per block, never a migration number |
| F193–F195 | Search | done (`#/search`) | + payouts and help requests (New) |
| F196–F201 | Jobs | done (`#/tasks`) | all 11 filters (?filter=), `?q=` search, test jobs hidden; held-now column hidden for Sales |
| F202–F222 | One job | done (`#/tasks/4821`, `4790` never paid, `4802` finished, `4846` hidden) | F210 as Sales |
| F223–F233 | People | done (`#/users`) | all 9 filters, tag chips (?tag=), "=1+1" tag behind Hide test data; wallet column and Money filter hidden for Sales |
| F234–F263 | One person (5 tabs) | done (`#/users/u2`, `?tab=money|followups|devices|audit`, `u4` suspended, `u12` deleted) | |
| F264–F267 | Devices | done (`#/devices`) | Windows and Mac cards added; F267 states under "Other states of this page" |
| F268–F272 | Alerts | done (`#/alerts`) | kinds in plain words, job ids as links, repeated alerts grouped (New) |
| F273–F283 | Flagged content (was Reports) | done (`#/reports-queue`) | Open / Handled (?view=done); breadcrumb added |
| F284–F299 | Copyright notices | done (`#/copyright`) | repeat-infringer pill at 3; restore waits until the date; F284 under "Before it is switched on" |
| F300–F309 | Feedback board | done (`#/feedback`) | ?tab= incl. hidden and notes |
| F310–F317 | Skills & categories | done (`#/catalog`) | ?kind=category, ?f=added|new|hidden; nav badge 7 |
| F318–F329 | Customer hub | done (`#/crm`) | "=1+1" tag behind Hide test data |
| F330–F334 | Follow-ups & pipeline | done (`#/crm/tasks`) | ?view=all|done; breadcrumb added |
| F335–F341 | Leads | done (`#/crm/leads`) | ?stage= and ?owner= filters |
| F342–F351 | Segments | done (`#/crm/segments`) | ?owner=me|nobody; wallet filter/column hidden for Sales |
| F352–F357 | Messages | done (`#/crm/messages`) | ?to=segment preselects the Segments filter |
| F358–F359 | Team performance | done (`#/team/performance`) | ?days=7|30|90; breadcrumb added |
| F360 | Settings tabs | done (`setHead` on every settings route) | |
| F361–F372 | Team & access | done (`#/settings/team`) | F362 shown as Off for now |
| F373–F389 | Money & timing | done (`#/settings`) | readable names in Advanced; `min_topup_minor` marked "Not used since Plan B" |
| F390–F396 | App switches | done (`#/settings/switches`) | F391/F392 shown as Off for now |
| F397–F417 | Web, Android & iOS | done (`#/settings/controls`) | F409 top-ups marked "Not used since Plan B" |
| F418–F424 | Rules | done (`#/settings/rules`) | "Topped up" rule marked Not used since Plan B |
| F425–F431 | Integrations | done (`#/settings/integrations`) | 30 vs 90 idle note; allowed account masked for non Admin/Support |
| F432–F437 | System health | done (`#/settings/health`) | "preview" environment warning; background jobs card (New) |
| F438–F442 | Audit log | done (`#/settings/audit`) | F441 before → after in plain words, raw JSON tucked away |
| F443–F446 | My security | done (`#/security`) | F443–F445 shown as Off for now; F446 note shown |
