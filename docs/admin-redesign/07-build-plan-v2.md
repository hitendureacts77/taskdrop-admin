# Admin design v2: build plan (28 Nov 2026)

Replaces `04-staging-build-plan.md` (v1, superseded). Target: `design/admin-design-v2.html` (approved by the owner, "build it and deploy"). Features: `05-full-feature-list.md` (F001–F446). Notes: `06-design-v2-notes.md`. Live walk: `live-walk-28-nov.md`.

**Approach:** improve today's admin in place, behind a gate. Same routes, same server actions, same data. With the gate off the admin looks and behaves exactly as today (production stays on the old admin).

**Status:** WP0 (foundation) built and merged. WP1–WP10 not started.

---

## 1. Gate

v2 renders only when BOTH hold:

1. `NEXT_PUBLIC_ADMIN_V2` is exactly `on` at build time (set on the **staging** Vercel admin project only), and
2. the `environment` app control (`get_app_controls('web')`) is exactly `staging`.

- Code: `src/lib/v2-gate.ts` (pure, unit-tested), `src/lib/v2-gate-server.ts` (`getV2()`, cached per request). Anything else (missing key, failed read, `Staging`, `preview`, `production`) means **off**. `src/lib/environment.ts` (ribbon, "unknown = staging") is not used for the gate.
- Checked 28 Nov: staging `get_app_controls('web')->>'environment'` returns exactly `staging`. The "preview" seen on System health in the live walk is Vercel's `VERCEL_ENV`, not the app control.
- Mechanism: the root layout puts `data-v2="on"` (and `data-theme` when the person forced light or dark) on `<html>` only when the gate is on. `app/(dashboard)/layout.tsx` picks `V2Shell` instead of today's shell. Every rule in `src/app/v2.css` and `src/app/v2/*.css` starts with `[data-v2]`; `src/lib/v2-css-scope.test.ts` fails the test run if one does not.
- MFA: unchanged. `settings.admin_require_mfa` is `false` on staging, `moneyMfaGate()` returns null when it is off, and the database trigger `private.require_admin_mfa` reads the same setting, so nothing blocks money actions while it is off. The top-bar "Unlock money actions" chip shows only when the switch is on and the session has no code (as today). Authenticator pieces are shown with `OffTag` ("Off for now · turn on later").

## 2. Rules for every package

1. **Gate off = today.** Never change what renders with the gate off. Put v2 work on the v2 path: `const v2 = await getV2();` in the page, then `v2 ? <NewThing/> : <OldView/>`, or add new v2-only blocks next to the old view (`{v2 ? <NewBlock/> : null}`).
2. **Reuse, do not copy.** Restyle today's markup with CSS in your package's `src/app/v2/<wp>.css` first. Write a v2 version of a section only when the design needs different structure. Keep using today's server actions and data functions.
3. **File ownership.** Only touch the files your package owns (table in section 4). Files used by more than one package are **frozen** (section 4.1): build a new component under `src/components/v2/<wp>/` and switch your own `page.tsx` to it on the v2 path.
4. **New server actions** go in `src/lib/v2/<wp>-actions.ts`. Each one: `requireAdmin()`, role check (`staffCan`), `moneyMfaGate()` for money (it passes while MFA is off), rate limit where today's twin has one, audit through the RPC. The `Confirm` button is UI only.
5. **Migrations** live in the user repo (`Taskdrop user/supabase/migrations`), forward-only, applied to **staging** `wjxvingpfbfvkfqhrguj` only, with the numbers reserved in section 4.2. Never production.
6. **Hide test data:** every list your package shows must respect `getHideTestData()` (section 6.6).
7. **Plain words:** no snake_case keys, raw ids or JSON in the main text; "Not set up on this server yet" (`SetupNotice`), never "run migration X". Jade = poster/Hire, blue = worker/Earn, gold = held money, orange = problems, red = danger. `NewTag` on anything today's admin does not have, `OldTag` on pre-Plan B leftovers (owner decision 1: keep them).
8. **Roles:** hide money for Sales (`staffCanSee(role,'money')`), lock every change for Viewer (`Confirm` does it). Confirm tiers per `06-design-v2-notes.md`; no authenticator codes.
9. **Done checks** for every package: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` (gate off), a gate-on build plus the Playwright check in section 7.3 for your routes (1280 px and 375 px, light and dark, no console errors, no sideways scroll, a breadcrumb on every page), the `security-review` skill on the PR diff (fix every Critical/High), and the plan line in `Taskdrop user/docs/ULTIMATE_PLAN.md` (root CLAUDE.md rule).

## 3. Owner decisions used

1. Pre-Plan B leftovers stay, tagged "Not used since Plan B". 2. Payouts stay as today. 3. Idle sign-out 30 minutes: align the setting (`admin_session_idle_minutes` is 90 on staging; the server uses `ADMIN_IDLE_MINUTES`, default 30). 4. Keep the staff allowlist, with a warning. 5. Add the dispute split (money, Opus). 6. Promotions: stop and give back the unused part, as today. 7. `dev_otp_for_all` shows as a red launch blocker (it is `true` on staging). 8. Launch areas and the walkthrough link go on Web, Android & iOS. No two-step sign-in now.

## 4. Work packages

| WP | Area | Model | Owns (exclusive) | F-IDs | Backend (migration numbers reserved) | Depends on |
|---|---|---|---|---|---|---|
| WP0 | Foundation | [opus] | done (section 6) | F001–F027 shell parts | none | none |
| WP1 | Money, payouts, refunds | [opus] | `app/(dashboard)/money/**`, `payouts/**`, `refunds/**`; `components/views/MoneyView.tsx`, `EntriesView.tsx`, `ReconcileRuns.tsx`, `PayoutsView.tsx`, `PayoutDetailView.tsx`, `WhoseMoney.tsx`, `MoneyLock.tsx`, `UpiQr.tsx`; `lib/actions.ts` (owner; others must not edit it); `lib/data/money.ts`, `lib/data/payouts.ts`, `lib/money-calc.ts`, `lib/payout-dest.ts`, `lib/utr.ts`; `components/v2/money/**`; `lib/v2/money-actions.ts`; `app/v2/wp1-money.css` | F084–F154 | 250 money-check "Mark explained" table + RPC; 251–254 spare (Plan B money-move list/retry already exist: `admin_plan_b_overview`, `admin_plan_b_retry_move`, `admin_set_money_paused`) | WP0 |
| WP2 | Disputes and the job page | [opus] | `app/(dashboard)/disputes/**`, `tasks/**`; `components/views/TaskView.tsx`, `TasksView.tsx`, `PhotoStrip.tsx`; `lib/data/tasks.ts`, `lib/data/disputes.ts`, `lib/task-timeline.ts`; `components/v2/jobs/**`; `lib/v2/jobs-actions.ts`; `app/v2/wp2-disputes-jobs.css` | F155–F157, F196–F222 | 255 `admin_resolve_dispute_split` (split amount, Razorpay partial refund + worker transfer under Plan B, writes `dispute_decisions.worker_paid_minor/poster_refunded_minor`); 256 waive fine / remove worker / mark complete RPCs if missing; 257–259 spare | WP0; coordinate money moves with WP1 (read-only use of its helpers) |
| WP3 | People, person page, devices | [sonnet] | `app/(dashboard)/users/**`, `devices/**`; `components/views/UsersView.tsx`, `UserView.tsx`, `UserTabs.tsx`, `PersonCrm.tsx`, `DevicesView.tsx`; `lib/data/users.ts`, `lib/data/people.ts`, `lib/user360.ts`, `lib/devices-calc.ts`; `components/v2/people/**`; `lib/v2/people-actions.ts`; `app/v2/wp3-people.css` | F223–F267 | none expected (Warn uses existing `admin_warn_user`); 267–268 spare | WP0 |
| WP4 | Dashboard and Needs you | [sonnet] | `app/(dashboard)/page.tsx`, `needs-you/**`, `loading.tsx`, `error.tsx`, `not-found.tsx`; `components/views/DashboardView.tsx`, `SalesDashboardView.tsx`, `NeedsYou.tsx`, `LiveStrip.tsx`, `LiveFeed.tsx`, `LineChart.tsx`, `earningsChart.ts`; `lib/needs-you.ts`, `lib/needs-you-data.ts`; `components/v2/dashboard/**`; `app/v2/wp4-dashboard.css` | F036–F083 | none (red blocker reads `settings.dev_otp_for_all`) | WP0 |
| WP5 | Safety, support, copyright, team alerts | [sonnet] | `app/(dashboard)/support/**`, `reports-queue/**`, `copyright/**`, `alerts/**`; `components/views/ModerationViews.tsx`, `CopyrightView.tsx`, `AlertsView.tsx`, `ReplyBox.tsx`, `CopyrightForms.tsx`; `lib/copyright*.ts`, `lib/alerts*.ts`, `lib/data/support.ts`; `components/v2/safety/**`; `lib/v2/safety-actions.ts`; `app/v2/wp5-safety-support.css` | F158–F165, F268–F299 | 265–266 spare | WP0 |
| WP6 | CRM | [sonnet] | `app/(dashboard)/crm/**`; `components/views/CrmViews.tsx`, `LeadsView.tsx`; `CrmForms.tsx`, `CrmOwnerForms.tsx`, `LeadForms.tsx`, `GrowthForms.tsx`; `lib/crm*.ts`, `lib/leads*.ts`, `lib/growth*.ts`; `app/api/crm/**`; `components/v2/crm/**`; `app/v2/wp6-crm.css` | F318–F357 | none | WP0 |
| WP7 | Business reports, team performance | [sonnet] | `app/(dashboard)/reports/**`, `team/**`; `app/api/reports/**`; `lib/ops*.ts`, `lib/earnings.ts`; `components/v2/reports/**`; `app/v2/wp7-reports-team.css` | F170–F192, F358–F359 | none | WP0 |
| WP8a | Settings: money & timing, switches, Web/Android/iOS, team & access, my security | [opus] | `app/(dashboard)/settings/page.tsx`, `settings/switches/**`, `settings/controls/**`, `settings/team/**`, `security/**`; `components/views/ControlsView.tsx`; `ControlsForms.tsx`, `StaffControls.tsx`, `MfaPanel.tsx`; `lib/controls*.ts`, `lib/admin-actions.ts`, `lib/admin-config.ts`, `lib/setting-input.ts`, `lib/data/settings.ts`; `components/v2/settings/**`; `lib/v2/settings-actions.ts`; `app/v2/wp8a-settings.css` | F360–F417, F443–F446 | 260 launch areas (table + admin RPC + `get_app_controls` key); 261 walkthrough link (app control or setting + admin RPC); 262 switch history read RPC if `admin_audit_log` RLS blocks it (history = `action='app_control_changed'` rows, before/after already stored); 263–264 spare. Data change: set `admin_session_idle_minutes` to 30 on staging. | WP0 |
| WP8b | Settings tools: rules, integrations, system health, audit log | [sonnet] | `app/(dashboard)/settings/rules/**`, `settings/integrations/**`, `settings/health/**`, `settings/audit/**`; `components/views/RulesViews.tsx`, `RulesForms.tsx`, `SystemHealthCard.tsx`; `lib/rules*.ts`, `lib/audit-*.ts`; `components/v2/settings-tools/**`; `app/v2/wp8b-settings-tools.css` | F418–F442 | none (audit diff uses `DiffList`) | WP0 |
| WP9 | Catalog, feedback, promotions | [sonnet] | `app/(dashboard)/catalog/**`, `feedback/**`, `promotions/**`; `components/views/CatalogView.tsx`, `FeedbackView.tsx`; `lib/catalog*.ts`, `lib/feedback*.ts`, `lib/data/promotions.ts`; `components/v2/catalog/**`; `app/v2/wp9-catalog-feedback-promotions.css` | F166–F169, F300–F317 | none (Stop promotion keeps today's `stopPromotion` action) | WP0 |
| WP10 | Search, badges, sign-in pages, shell polish | [sonnet] | `app/(dashboard)/search/**`, `app/login/**`, `app/not-authorized/**`; `lib/data/search.ts`, `lib/find-person.ts`; `lib/data/nav-v2.ts` (fills `readExtraCounts`); new `app/api/search/route.ts` (typeahead); `components/v2/search/**`; `app/v2/wp10-search-shell.css`. After WP0 only WP10 may edit `components/v2/V2TopBar.tsx` (to mount the typeahead). | F001–F035 (rest), F193–F195 | 269 spare (counts read existing tables) | WP0 |

All WP1–WP10 can run in parallel: no file is owned twice. Opus packages: WP1, WP2, WP8a (money, security, migrations). The rest are Sonnet.

### 4.1 Frozen shared files (no package edits them; ask the lead)

`app/layout.tsx`, `app/(dashboard)/layout.tsx`, `app/globals.css`, `app/v2.css`, `components/v2/{ui.tsx,Confirm.tsx,V2Shell.tsx,V2Frame.tsx,V2Sidebar.tsx,V2BottomBar.tsx,nav.ts,roles.ts}`, `components/ui.tsx`, `components/ConfirmAction.tsx`, `components/Icon.tsx`, `components/Sidebar.tsx`, `components/LiveProvider.tsx`, `lib/v2-gate*.ts`, `lib/test-data*.ts`, `lib/staff-roles.ts`, `lib/data/shared.ts`, `lib/data/nav.ts`, `lib/data/index.ts`, `package.json`. Multi-route view files: `components/views/QueuesViews.tsx` (WP1 refunds, WP2 disputes, WP5 support), `MoreViews.tsx` (WP1/WP7/WP8a/WP9/WP10), `AnalyticsViews.tsx` (WP1 reconcile, WP7 reports), `AdminConfigViews.tsx` (WP8a, WP8b), `CrmGrowthViews.tsx` (WP6, WP7), `DevicesToolsCard.tsx` (WP3, WP4), `SetupNotice.tsx`. A package that needs a new icon or a shared component asks the lead; the lead adds it in a small foundation PR.

New unit tests: add them to the `test` script in a separate tiny PR by the lead at merge time, or name them in the package report (package.json is frozen to avoid merge clashes).

### 4.2 Migration numbers

Last used on `redesigned-2.0`: 243. 244–249 left for other sessions. Admin v2: WP1 250–254, WP2 255–259, WP8a 260–264, WP5 265–266, WP3 267–268, WP10 269.

## 5. Backend reality check (staging, 28 Nov)

| Need | Exists? | Gap / owner |
|---|---|---|
| Plan B money moves list + retry | Yes: `admin_plan_b_overview()`, `admin_plan_b_retry_move(p_hold_id, p_reason)` (logs via `admin_log_event`), table `task_holds` | UI only (WP1) |
| Pause all money / money flow / provider | Yes: `admin_set_money_paused(p_paused, p_reason)`; settings `money_paused`, `money_flow`, `money_provider` | UI only (WP8a) |
| Dispute decide | Partly: `admin_resolve_dispute(p_task_id, p_outcome, p_note)` takes only `worker` / `poster`; `dispute_decisions` already has `worker_paid_minor`, `poster_refunded_minor` | **Build** split RPC + money moves (WP2, migration 255) |
| Per-platform switch with reason | Yes: `admin_set_app_control(p_platform, p_changes, p_reason)`; logs `app_control_changed` with before/after into `admin_audit_log` (`at, actor, action, target_table, target_id, before, after, detail`) | History = read those rows (WP8a); RPC only if RLS blocks the read (262) |
| Maintenance message, oldest version, update link, banner (text, level, link, ends at) | Yes: columns on `app_controls` | UI only (WP8a) |
| Launch areas | **No** table, setting or control | **Build** (WP8a, 260) + user app must read it (user repo task) |
| Walkthrough YouTube link | **No** key | **Build** (WP8a, 261) + user app row X reads it |
| Money check "Mark explained" | **No** (`reconciliation_runs` has `detail` jsonb only) | **Build** (WP1, 250) |
| Warn a person | Yes: `admin_warn_user(p_user, p_reason, p_report)` | Button only (WP3) |
| Idle sign-out 30 min | Setting `admin_session_idle_minutes` = 90; server env default 30 | Set to 30 on staging + show both (WP8a) |
| Developer sign-in blocker | `settings.dev_otp_for_all` = true | Red blocker (WP4 dashboard, WP8a switches) |
| Staff allowlist warning | `ADMIN_EMAIL`/`ADMIN_PHONE` env + `admin_staff` | Warning only (WP8a) |
| Sidebar badges (flags, copyright, alerts, feedback, catalog, money check) | Tables exist (reports, copyright notices, alerts, feedback, catalog, reconciliation) | Counts in `nav-v2.ts` (WP10) |
| Global search typeahead | `/search` page exists | New `/api/search` route (WP10), staff-only, rate-limited |
| Hide test data | No flag column; markers: fake seed ids `fa4e0001-…` (120 people, 453 jobs, 54 withdrawals), `[e2e]` job titles (488), phones `98880…` | Foundation helpers (done) |

## 6. Foundation API (WP0)

### 6.1 Gate and preferences (server)
- `getV2(): Promise<boolean>` (`lib/v2-gate-server.ts`): use in a page to choose the v2 path.
- `getV2Theme(): 'light'|'dark'|'system'`: from cookie `td_theme` (set by the top-bar button).
- `getHideTestData(): Promise<boolean>`: true only when v2 is on and cookie `td_hide_test=1`.
- `isV2Enabled(flag, env)`, `rawEnvironment(controls)` (`lib/v2-gate.ts`): pure.

### 6.2 Shell (done, frozen)
`V2Shell` (chosen by `app/(dashboard)/layout.tsx`): grouped, foldable sidebar with count badges, folded-group totals and "was …" old names (`V2Sidebar`, list in `components/v2/nav.ts`), fold-to-icons rail (remembered per browser), top bar (`V2TopBar`: phone menu button, global search with `/` shortcut → `/search?q=`, live chip, alerts, Payouts, Needs you count, date, light/dark button, account menu with Hide test data, Follow device theme, My security, Team & access, Sign out), staging ribbon (root layout, v2 look), automatic breadcrumbs from the address (`V2AutoCrumbs`, hidden when the page renders its own `.crumbs` or `PageHeader` crumbs), phone bottom bar (Home, Needs you, Money or Customers for Sales, People, Menu) and drawer (`V2BottomBar`, `V2Frame`). Same `LiveProvider`, `IdleGuard`, sign-out action as today.
- Badges: `payouts/refunds/disputes/support` from today's counts, `needs` live, the rest from `getV2NavCounts` (`lib/data/nav-v2.ts`, WP10 fills `readExtraCounts`). Sales gets money counts as 0.
- Client state: `useV2()` → `{ role, env, hideTest, drawer, setDrawer, collapsed, toggleCollapsed }`.

### 6.3 Components (`import * as v2 from '@/components/v2/ui'`, server-safe)
| Component | Use |
|---|---|
| `v2.PageHeader({ title, sub, crumbs, right })` | Every v2 page starts with it. `crumbs` without Home, e.g. `[{label:'Payouts', href:'/payouts'}, {label:'Ravi ₹1,470'}]`. |
| `v2.Grid({ cols: 2|3|4|5|'main' })`, `v2.SectionTitle` | Layout; collapses to one column on phones. |
| `v2.Card({ title, sub, right, tone:'warn'|'new', id })` | Card. |
| `v2.Tile({ label, value, foot, tone:'gold'|'jade'|'blue'|'orange'|'red', href, small })` | Big number. |
| `v2.Pill({ tone:'ok'|'earn'|'wait'|'bad'|'danger'|'mut' })` | Status dot + word. |
| `v2.NewTag`, `v2.OldTag` ("Not used since Plan B"), `v2.OffTag` ("Off for now · turn on later"), `v2.TestTag({show})` | Tags. |
| `v2.Note({ tone, title })`, `v2.SetupNotice({ what, detail })`, `v2.Blocker({ title, action })` | Notices; `SetupNotice` is the only wording for a missing table/RPC/key; `detail` (small mono) may name the key. |
| `v2.Empty`, `v2.Loading({ lines })`, `v2.ErrorState({ detail, retryHref })` | Empty / loading / error states. |
| `v2.DataTable({ columns, rows, empty })` | `columns=[{label, right}]`, `rows=[{key, cells, href, test, late}]`. Phone card layout automatic. Put inside `v2.Card`. |
| `v2.TableSearch({ action, value, keep })`, `v2.Pager({ page, pageSize, total, hrefFor })`, `v2.Tabs`, `v2.Chips` | Search (GET form), paging, tabs, filter chips. |
| `v2.KV({ rows:[[k,v]] })` | Label/value list. |
| `v2.BeforeAfter({ label, before, after })`, `v2.DiffList({ before, after, labels })` | Readable before → after (audit log, switch history, settings). |

### 6.4 Confirm tiers (`import { Confirm } from '@/components/v2/Confirm'`, client)
```tsx
<Confirm action={markPayout} hidden={{ id }} label="Record payout" tier={3} area="money"
  title="Record ₹1,470 paid to Ravi?" body={<p>What happens to whose money…</p>}
  reason={{ label: 'UTR or note' }} word="1470" confirmLabel="Record payout" tone="pri" />
```
- `action` is today's `FormAction` (`(prev, FormData) => {ok, message}`); FormData carries `hidden`, `reason` (when asked), `confirm_word`, and any inputs passed in `fields`.
- `tier` 1 = runs at once + toast (pass `undo={{ action, hidden }}` for Undo); 2 = box + optional reason; 3 = box + type the `word` (words ignore case, amounts ignore commas and ₹).
- `area`: `money` (Admin, Finance), `people` (Admin, Support, Sales), `admin` (Admin), `any` (not Viewer). A role that may not act sees the button disabled with the reason on hover. The box always shows STAGING or PRODUCTION.
- `asSwitch={{ on, red }}` renders a toggle that opens the same box (kill switches).
- The server action must still check role, MFA gate and limits.

### 6.5 Roles
`canAct(role, area)`, `lockReason(role, area)`, `wordMatches(typed, word)` in `components/v2/roles.ts`. Sales: no Money group, no Business reports, no Settings in the v2 nav (`v2NavFor`); pages keep `requireSeeing('money'|'settings')`. Viewer: every `Confirm` locked.

### 6.6 Hide test data
- Toggle: account menu → sets cookie `td_hide_test` and refreshes. Server: `await getHideTestData()`.
- Pure rules (`lib/test-data.ts`): `isTestUserId(id)` (fake seed `fa4e0001-…`), `isTestTitle(title)` (`[e2e]…`), `isTestPhone(phone)` (`98880…`), `isTestRow({ id, userId, posterId, title, phone })`.
- In a Supabase query: `if (hide) q = q.or(notTestIdFilter('poster_id')).not('title', 'ilike', '[e2e]%')` (`notTestIdFilter` keeps nulls). For lists filtered in JS: `rows.filter((r) => !hide || !isTestRow(r))`. Counts and totals on the same page must use the same filter. When not hiding, mark test rows with `test: true` in `DataTable` (yellow TEST label).

### 6.7 CSS
Tokens (`--jade`, `--blue`, `--gold`, `--orange`, `--red` each with `-t` text, `-s` soft, `-l` line; `--surface`, `--sunk`, `--line`, `--ink`, `--muted`, `--r`, `--rc`) in `app/v2.css`, light + dark (device, or forced by `data-theme`). Today's variable names are re-pointed so old pages get dark mode. Page styles: your package's `app/v2/<wp>.css`, every selector starting `[data-v2]` (enforced by `npm test`).

## 7. Test matrix

### 7.1 Admin change → customer app (staging `taskdrop.in`)
| Admin action (page) | Where it must show in the customer app |
|---|---|
| Kill switch Web/Android/iOS/Everywhere: posting, bidding, withdrawals, promotions, chat photos, sign-in methods, sign-ups (Web, Android & iOS) | Post / Bid / Withdraw / Promote buttons disabled with the switch message; sign-in screen hides the method; per platform only |
| Maintenance on + message (same page) | Full-screen maintenance with that message on that platform |
| Oldest version / update link | Android "update needed" screen (web unaffected) |
| Banner text, level, link, end time | Banner on Home until the end time |
| Launch areas (new) | Posting outside the areas blocked / "not in your area yet" |
| Walkthrough link (new) | "How TaskDrop works" page plays the link |
| Pause all money (App switches) | Paying, releasing and withdrawing show "paused" |
| Hide a job / unhide (job page) | Job gone from Explore, map and search; poster sees "hidden by TaskDrop" |
| Hide message / review / media | Message, review or photo removed in chat / profile |
| Suspend / warn a person (person page) | Suspended: signed out, cannot sign in; warned: in-app notice |
| Decide a dispute: pay worker / refund poster / split (new) | Job status, poster refund line, worker earning line, notifications to both |
| Cancel job and refund | Job cancelled; poster sees refund in Money |
| Record payout / give back (Payouts) | Worker's withdrawal shows Paid (with UTR) or Returned to wallet |
| Send refund (Refunds) | Poster's money ledger shows the refund |
| Stop promotion | Promotion badge gone; unused part back in Money |
| Reply / resolve help request | Reply in the person's Help thread; status Resolved |
| Copyright takedown / restore | Content hidden / back |
| Feedback reply / status / hide | Ideas board shows reply, new status, or hides the post |
| Catalog rename / merge / hide | Skill names and suggestions while posting |
| CRM message (broadcast) | Notification / inbox message to the segment |
| Money and timing settings (fees, caps, review window) | Fee shown on Post, withdraw limits, auto-release timing |
| Developer sign-in off | Any phone number no longer auto-fills a code |

### 7.2 Customer activity → admin
| Customer does (taskdrop.in) | Where it must show in the admin |
|---|---|
| Signs up / onboarding | People (new today), dashboard counts, Customer hub stage, live feed |
| Signs in on a new device | Person → Devices; Devices page |
| Posts a task | Jobs, dashboard, live feed, map counts |
| Bids / is picked | Job page bids and timeline |
| Chats | Job page chat evidence (audit note when opened) |
| Pays / hold placed (Plan B) | Earnings & escrow held now, Pay per task moves, job page money |
| Work done / released | Moves list, worker earnings, Money check |
| Requests a withdrawal | Payouts list, Needs you, sidebar badge, alert |
| Opens a dispute | Disputes, Needs you, job page, badge |
| Reports content | Flagged content, badge |
| Help request | Help requests, Needs you, badge |
| Feedback post / comment | Feedback board, badge |
| Promotes a task | Promotions |
| Copyright notice (web form) | Copyright notices, Needs you |
| Deletes account | Person page "deleted", audit log |

### 7.3 Automation
- **Admin:** run the admin locally on port 3001 against staging (`.env.local` from the main admin folder), built with `NEXT_PUBLIC_ADMIN_V2=on` (`npm run build && npx next start --port 3001`; `next dev` does not hydrate under the nonce CSP, so use a production build for clicks). Sign in with a test staff account per role: `ADMIN_E2E_<ROLE>_USERNAME/PASSWORD` in the environment only (never committed, never typed into a production page). These accounts do not exist yet: **waiting for your OK** to create test staff accounts (one per role) on staging. Until then: unauthenticated checks (gate attribute on `/login`), unit tests, and a local preview route for the shell (WP0 used one and removed it).
- **Customer:** Playwright against staging `taskdrop.in` with fake seed phones `98880…` and `dev_otp_for_all` (code auto-fills). Never real numbers.
- **Pairs:** each row in 7.1/7.2 becomes one spec: act on one side, then poll the other side (≤ 60 s) for the text. Specs live in `e2e/v2-*.spec.ts`, one file per package, only reading or changing fake seed data, and undoing what they change (switch back on, unhide).
- Per package, at least: open every owned route as Admin and as Viewer at 1280 and 375 px in light and dark; no console errors; `document.documentElement.scrollWidth <= innerWidth`; a breadcrumb present.

## 8. Deploy steps (lead or owner)

1. Merge WP0 (gate off everywhere; nothing visible changes).
2. Set `NEXT_PUBLIC_ADMIN_V2=on` on the **staging** Vercel admin project only (Production and Preview environments of that project as needed). Do **not** add it to `taskdrop-admin-production`.
3. Redeploy staging (`admin.taskdrop.in`). Check: `<html data-v2="on">` on `/login`, v2 shell after sign-in.
4. Production check: `taskdrop-admin-production.vercel.app/login` has no `data-v2`. Even with the variable set by mistake, production's `environment` control is `production`, so the gate stays off.
5. Merge each package as it lands; staging updates by itself.

## 9. Order

WP0 → WP1..WP10 in parallel (Opus: WP1, WP2, WP8a; Sonnet: the rest) → lead checks each diff + checks and merges → full Playwright pass (7.3) → owner look on `admin.taskdrop.in`.
