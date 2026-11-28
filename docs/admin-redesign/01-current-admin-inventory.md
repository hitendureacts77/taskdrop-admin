# Current admin panel inventory (28 Nov 2026)

Repo `Taskdrop administrator`, branch `redesigned-2.0`. This file is read-only input for the redesign.

## Stack, deploy and sign-in
- **Stack:** Next.js 16 (App Router, Server Actions), React 19, TypeScript and `@supabase/ssr`.
  - Sentry project `taskdrop-admin`.
  - No Tailwind and no UI library. Icons are inline SVG and charts are hand-made SVG.
- **Hosting:** Vercel, region `bom1`.
  - Staging is `admin.taskdrop.in` and `taskdrop-admin.vercel.app`. It uses Supabase project `wjxvingpfbfvkfqhrguj` with fake data.
  - Production is `taskdrop-admin-production.vercel.app`.
  - Both are built from `redesigned-2.0`.
  - A gold staging ribbon shows unless the app control `environment` is `production`.
  - Local dev runs on port 3001.
- **Security:**
  - CSP with a nonce, noindex, every page `force-dynamic`.
  - Sign-out after 30 idle minutes.
  - Sign-in with Google OAuth or a password (`password-auth` edge function). The account must have `admin` in `user_roles`.
  - Money, refund, dispute, wallet, settings and role actions need an MFA code when `admin_require_mfa` is on. The top bar then shows an "Unlock money actions" chip.

## Staff roles
Roles live in the `admin_staff` table and `src/lib/staff-roles.ts`.

| Role | What it can do |
| --- | --- |
| Admin (no row in the table) | Everything |
| Finance | Payouts, refunds, wallet, disputes |
| Support | Help requests, CRM, suspensions, copyright |
| Sales | Same as Support, but money and settings are hidden; gets no alerts |
| Viewer | Read-only |

- Settings, switches, team and account deletion are Admin only.
- Changing a role needs MFA.
- There must always be at least one Admin, and nobody can change their own role.

## Pages today
There are 37 pages. "(w)" means the page can change data.

**Top**
- `/` Dashboard: right-now strip, live feed, earnings and escrow, things to do. Sales staff get a different dashboard.
- `/needs-you` Needs you now: one queue of withdrawals, refunds, disputes, help requests and copyright notices, with the time each has waited against the 24 h / 48 h promise.

**Money** (hidden from Sales)
- `/money` Earnings and escrow.
- `/money/entries` Ledger entries. Not in the sidebar.
- `/payouts` (w): check with RazorpayX, pay by hand with a UTR, give back to wallet, change payout method.
- `/payouts/[id]` (w): one payout, with a UPI QR code.
- `/refunds` (w): send a Razorpay refund.
- `/money/reconcile` (w): money check runs.

**People and jobs**
- `/tasks` Jobs: filters and search.
- `/tasks/[id]` (w): resolve a dispute, cancel with refund, hide or unhide, set category. Also shows the timeline, quotes, reviews and photos.
- `/users` People: filter by tag or suspended, CSV export.
- `/users/[id]` (w): tabs for overview, money, devices, follow-ups and audit. Actions: notes, tags, message, suspend, delete account, sign out everywhere.
- `/devices`: app versions.
- `/disputes`: read-only list; decisions happen on the job page.
- `/reports-queue` "Reports" (w): flagged content. Resolve, warn, hide or unhide a message, review or task.
- `/alerts` (w): messages from background jobs.
- `/support` and `/support/[id]` (w): reply and resolve.
- `/copyright` (w): notice, takedown, reject, counter-notice, restore.
- `/feedback` (w): status, reply, hide.
- `/promotions` (w): ROI, pause.

**CRM**
- `/crm` hub.
- `/crm/tasks` follow-ups (w).
- `/crm/leads` (w).
- `/crm/segments` (w).
- `/crm/messages` broadcast to up to 5,000 people (w).

**Reports**
- `/reports`: business reports and growth (funnel, retention), with CSV.
- `/team/performance`.
- `/search`: jobs and people only.

**Settings** (9 tabs)
- `/settings/team` (w).
- `/settings` Money and timing (w): fee %, waiting days, budgets.
- `/settings/switches` (w): MFA requirement and `dev_otp_for_all` (type ON to turn it on).
- `/settings/rules`: CRM automation rules (w).
- `/settings/controls` "Web, Android & iOS" kill switches (w). Covers signups, each sign-in method, posting, bidding, top-ups, withdrawals, promotions, chat photos and phone verification.
- `/settings/integrations`: status, read-only.
- `/settings/health`: read-only.
- `/settings/audit`: read-only; before and after values show as raw JSON.
- `/security`: your own MFA.

## Design system today
- One `src/app/globals.css` (about 2,460 lines), with tokens on `:root`.
- Font: Plus Jakarta Sans, self-hosted.
- Light theme only; there is no dark mode.
- Colours:
  - Background `#f1f2f1`, surface `#fff`, ink `#16171a`.
  - Jade `--brand #0e8f72`, `--brand-strong #0a6f58`, `--deep #062b22`.
  - Royal blue `--blue #2f5bea`, `--blue-deep #1e40af`.
  - Gold (escrow or waiting) `#e0a85a`.
  - Signal orange (problems) `#e0724a`.
  - Radius 16px.
- Shell: a fixed 244px dark-green left sidebar (TD logo, 5 sections, 25 items) and a sticky top bar. The top bar has search, live dot, alerts toggle, payouts chip, MFA chip, date, email, role and sign out.
- Shared parts in `ui.tsx`: Money, Pill, PageHeader, Card, Notice, HowItWorks, Delta, Tabs, SearchBox, Pager, Empty, KV, StatLink, PersonLink, JobLink and StackBar. There is also `ConfirmAction` (a two-step confirm) and `MoneyLock`.

## Pain points for the owner
- There are too many entries: 25 sidebar items plus 9 settings tabs.
- Five places show the same waiting work: Dashboard "Things to do", Needs you, the Alerts page, the Alerts toggle and the badges.
- Some names are confusing:
  - "Reports" (flagged content) sits next to "Business reports".
  - "Rules" means CRM automation.
  - "Web, Android & iOS" means kill switches.
- Switches are spread across 3 tabs.
- The audit log and unknown settings show raw JSON.
- Search covers only jobs and people. Only 4 lists have a search box, and only 5 lists use pages.
- 13 views show "run migration X" when a table is missing, which looks like a broken page.
- There is no dark mode, and the layout is weak on a phone.
- Strength: every money and delete action has a confirm step. Keep this.

## Admin RPCs and edge functions (names)
- **Money:** `admin_money_position`, `admin_earnings_daily`, `platform_earnings`, `platform_stats`, `admin_payout_queue`, `admin_mark_payout`, `admin_set_payout_method`, `admin_reconcile`, `admin_cancel_task_with_refund`, `admin_resolve_dispute`, `admin_pause_promotion`, `admin_promotion_roi`.
- **Edge functions:**
  - `razorpay` (`refund-escrow`).
  - `razorpayx-payouts` (`balance`, `check-all`, `give-back`).
  - `app-config` and `password-auth`.
- **Ops:** `admin_live_counters`, `admin_live_events`, `admin_devices_summary`, `get_app_controls`, `admin_set_app_control`.
- **Team:** `admin_set_staff`, `admin_end_all_staff_sessions`, `admin_sign_out_everywhere`, `admin_delete_account`.
- **Moderation and copyright:** `admin_resolve_report`, `admin_warn_user`, `admin_hide_*` and `admin_unhide_*`, `admin_copyright_*`.
- **Feedback:** `admin_feedback_*`.
- **CRM:** `crm_*`, including `crm_send_broadcast`.
- **Growth:** `admin_business_daily`, `admin_marketplace_numbers`, `admin_retention`, `admin_funnel`, `admin_staff_performance`.
