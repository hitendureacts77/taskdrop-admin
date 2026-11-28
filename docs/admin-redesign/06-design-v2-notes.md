# Admin design v2: notes (28 Nov 2026)

File: `docs/admin-redesign/design/admin-design-v2.html` (one self-contained page, open it in a browser). Fake data only. Design, not build: nothing gets built until the owner approves.

## Approach
- **Today's admin, improved.** Same pages, same routes (`#/payouts/:id` = `/payouts/[id]` etc.), every existing feature kept. Nothing from v1's new 8-section layout.
- Reuses v1's look: jade = Hire, royal blue = Earn, gold = held money, orange = problems, red = danger; light and dark mode; confirm tiers; Plan B money screens; demo panel.
- Anything that does not exist in today's admin has a small blue dashed **New** tag. Everything else exists today.
- Pre-Plan B leftovers carry a grey **Not used since Plan B** tag. Authenticator pieces carry **Off for now · turn on later**.
- Checked: 75 routes × light/dark × 1280 px/375 px, plus 4 roles × 12 routes. No console errors, no page wider than the screen, a breadcrumb on every page.

## Confirm steps (no authenticator codes)
| Tier | What happens | Used for |
|---|---|---|
| 1 Quick | Done at once, toast with Undo | tags, owner, follow-ups, staff alert switch |
| 2 Check and confirm | A box says what happens to whose money; a reason box when the action needs one | hide a job, suspend, warn, message, lock a withdrawal, a switch for one platform, role change |
| 3 Type to confirm | As tier 2, then type a word or the amount (e.g. `1470`, `DECIDE`, `DELETE`) | record a payout, give back, send a refund, decide a dispute, cancel and refund, retry a money move, money settings, Everywhere kill switches, developer sign-in, pause all money, delete account, remove staff |

Every box also shows STAGING or PRODUCTION. Viewer sees every button locked, with the reason shown on hover.

## Improvements shown
1. Sidebar: grouped (Today, Money, Jobs & people, Help & safety, Customers, Reports & settings), groups fold up, count badge on every item with waiting work. A folded group shows its total. Renamed items keep the old name underneath ("Flagged content", was "Reports"; "Team alerts", was "Alerts"; "Settings", was "Admin & configuration"; "Needs you", was "Needs you now"). Disputes and Promotions moved into Money (Sales already had them hidden as money).
2. **Needs you** is the one waiting-work list: filters by kind, red rows past the promise, late / due soon / waiting summary. Dashboard "Things to do", the top-bar icon and the bottom bar all open it.
3. Global search: people, jobs, payouts and help requests. Arrow keys work, `/` jumps to the box, and "See all" opens the search page.
4. Audit log: before → after in plain words. Raw JSON only sits under "Technical details (for the developer)". Search box added.
5. "Not set up on this server yet" replaces "run migration X" everywhere (see `#/states`).
6. **Hide test data** (demo panel, account menu): hides the 50 "[e2e] dispute" rows, 5 seed withdrawals and seed people. Counts change with it (Needs you 83 → 28 rows, including the 2 copyright notices).
7. Dark mode follows the device, and a top-bar button forces light or dark.
8. Phone layout: bottom bar (Home, Needs you, Money or Customers, People, Menu) and a drawer menu. Tables turn into cards. 16 px side gutter, no sideways scroll.
9. Breadcrumbs on every page, including the 7 pages that have none today.
10. Payouts: oldest first, rows red after 7 days, "Locked 55 days: pay or give back", a RazorpayX "not connected, paid by hand" banner, a UTR pattern check.
11. Money check: problems grouped by kind with counts. Warnings for "Razorpay check looked at 0 payments" and "no checks 16–27 Nov". "Mark explained" (New).
12. Kill switches per platform (Everywhere / Web / Android / iPhone). Each change asks for a reason. "On via Everywhere" is shown, plus a maintenance message, oldest version, update link and banner (with live preview) per platform, and **switch history** (New).
13. Job page: dispute split (New), chat and proof evidence with an audit note, mark complete, waive fine, remove worker, show the private address (audit-logged).
14. Person page: Warn button (backend exists, no button today), Razorpay payee readiness, age check, pin/done/delete notes, tag add/remove.
15. Pay per task (Plan B) on Earnings & escrow: money moves with Retry, unpaid jobs that expired, Razorpay messages. Pause all money / money flow / provider on App switches.
16. Live findings shown with fake numbers: RazorpayX not connected, 23 withdrawals (55 days oldest), 140 money-check problems, 324 unread alerts, environment "preview" in the ribbon, idle 30 vs 90 minutes, developer sign-in ON as a red launch blocker, 5 of 6 staff not on the allowlist.

## Open owner decisions
1. **Pre-Plan B leftovers**: keep or remove the Wallet top-ups switch, the "Topped up but has not posted" rule, `min_topup_minor`, and the Wallet top-ups card on Business reports. All are shown as "Not used since Plan B".
2. **Withdrawals under Plan B**: do earnings still go to a wallet and then a withdrawal (today's Payouts), or straight to the worker by Razorpay Route? Payouts is kept as it is today either way.
3. **Idle sign-out**: the server uses 30 minutes, the setting says 90. Pick one.
4. **Panel sign-in**: 5 of 6 staff are not on the allowlist. Either add them to the allowlist or switch to "role only".
5. **Dispute split** (New): add a third choice, or keep only pay worker / refund poster?
6. **Promotions stop**: the user app says "no stop, no refund", but the admin can stop one and give back the unused part. Which rule wins?
7. Developer sign-in must be OFF before launch (red blocker on the dashboard and App switches).
8. Launch areas and the walkthrough YouTube link are placed on Web, Android & iOS (New). Is that the right page?

## For the Sonnet filler
**How to add a page:** in the last `<script>`, add `PAGES.<key>=(params,query)=>html` (put it before the empty `STUBS` line). Route keys and paths are in `ROUTES`; `query` is the parsed `?a=b` part (`query.filter`, `query.tab`…). Return one HTML string. No frameworks.

**Shared components (all return HTML strings):**
- `ph(title, sub, {crumbs:[['Label','#/path']], here:'Current', right:html})`: breadcrumb + page header. Home is added first. Every page must start with it (settings pages use `setHead('#/settings/…', sub)` instead).
- `card(title, body, {sub, right, id, cls})`, `tblCard(title, cols, rows, opts)`.
- `tile(label, value, foot, {tone:'gold|jade|blue|orange|red', href, sm})`.
- `tbl(cols, rows, {empty})`: `cols=[{l:'Label', r:1}]`, `rows=[{c:[cells], go:'#/path', test:bool, cls:'late'}]`. Wrap in `<div class="tblwrap">` inside a card. Phone card layout comes from `data-l` automatically.
- `pill(text, 'ok|earn|wait|bad|danger|mut')`, `NEW` / `newTag()`, `oldTag()`, `offTag()`, `tt(isTest)`.
- `tabs([[href,label,count,hot]], currentHref)`, `linkChips([[href,label,count]], cur)`, `chips(list, cur, onPickJs)`.
- `who(personId, sub)`, `jobLink(jobId)`, `inr(n)`, `ago(hours)`, `esc(s)`, `kv([[k,v]])`, `how(title, [[step, text]])`, `notice(tone, html, title)`, `setupNotice(what)`, `empty(icon, title, text)`, `pager(from, to, total)`, `copyBtn(value)`, `searchBox(placeholder, value, onEnterJs)`, `hbar(label, v, max, color, text, href)`, `lineChart(series, labels, {onPick})`, `numbersTable(labels, series)`.
- `act(label, {tier, area, title, body, fields, reason, word, go, tone, done, after})`: every button that changes something. `area`: `money` (Admin, Finance), `people` (Admin, Support, Sales), `admin` (Admin), `any` (not Viewer). Never ask for an authenticator code.
- `swBtn(key, on, {title, tier, area, word, dOn, dOff})`: toggle with the confirm step.
- Data: `P` (people), `T` (jobs), `PO` (withdrawals), `TICKETS`, `STAFF`, `disputes()`, `needsItems()`. Add new fake data near the page. Only fake names; the owner email is `owner@taskdrop.in`.

**Style rules:** plain words (no snake_case keys, no raw ids or JSON in the main text; put a key in small `mono muted` text only when the developer needs it). Jade = poster/Hire, blue = worker/Earn, gold = held money, orange = problems, red = danger. Mark anything not in today's admin with `NEW`. Hide money columns when `!seesMoney()`. Rows from seed or e2e data get `test:true`. No horizontal scroll at 375 px (tables already handle it). Re-run the check script afterwards: every route, both themes, 375 px, zero console errors.

**Stub pages: all filled (28 Nov).** The 21 stub routes (168 features: Jobs, People, Devices, Flagged content, Team alerts, Help requests and one request, Copyright, Feedback, Promotions, Skills & categories, Customer hub, Follow-ups, Leads, Segments, Messages, Business reports, Team performance, Rules, Integrations, System health) now have full pages. `STUBS` is empty and no "TODO page" text is left. Checklist: 446/446 done (see `05-full-feature-list.md`). Sign-in pages were already done.

Shell changes made with them: sidebar badges for Flagged content (open reports), Copyright notices (waiting notices), Team alerts (unread, drops when marked read) and Skills & categories (7 new). The 2 waiting copyright notices also show in **Needs you** (kind filter "Copyright notices"). Extra fake data: jobs 4777 (cancelled), 4811 (finished today), 4828 (overdue); people u13 (joined today), u14 (owner's own app account, admin); help request h-306 (answered).

Checked after filling: 113 routes × light/dark × 1280/375 px, plus 4 roles (Finance, Support, Sales, Viewer) × 35 routes: 0 console errors, no page wider than the screen, a breadcrumb on every page.
