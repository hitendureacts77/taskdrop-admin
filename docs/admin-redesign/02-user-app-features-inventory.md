# User-app features the admin must handle (28 Nov 2026)

Source: user repo `Taskdrop user`: routes.ts, 206 migrations, Inngest, screens, plan, git log.

How to read this file:
- "RPC ✓" means a `public.admin_*` function already exists.
- "UI?" means the RPC exists but it is not checked whether the admin panel uses it.

## 1. Users and profiles
- **Profile and username.** Tables `profiles` and `profile_private`.
  - Phone-number names become "New user" (migration 242), and names may not contain phone digits.
  - Admin: search, view, force-rename, clear bio or photo.
- **Age gate 18.** Table `age_checks`.
  - Admin: see status, reset it in a support case, list refused attempts.
- **Worker profile.** Fields `earn_goal` (business, gig or other; private), `weekly_goal_minor` and skills.
  - Admin: view only, plus a chart of the earn-goal mix.
- **User-added skills catalog.** Tables `catalog_terms` and `catalog_phrases`, with a meaning check. RPC ✓ for add phrase, merge, rename, hide, remove and set category.
  - Admin: review queue, merge duplicates, hide.
- **Account deletion.** Table `account_deletions`. RPC ✓ `admin_account_deletion_check` and `admin_delete_account`.
  - Admin: deletion log, delete on request, see what blocks it (money held, open jobs).
- **Devices and presence.** Table `app_devices`. RPC ✓ `admin_devices_summary`.
- **Revocable sessions.** RPC ✓ `admin_sign_out_everywhere`.
- **Suspend, warn and ban.** Tables `user_suspensions`, `user_warnings` and `user_roles`. RPC ✓ `admin_warn_user`.
  - Admin: warn, suspend until a date, ban, history.
- **Verification.** There is no ID KYC, only phone verified. For Plan B there is payee readiness (`payout_profiles`, Razorpay Route linked account).
  - Admin: payee status, fix a stuck linked account.
- **Referrals.** Admin: view and revoke abuse.
- **Streaks, regulars and stats.** View only. Notify-a-helper uses `task_helper_notices`.
- **New-account limits.** Settings `new_account_days`, `new_account_tasks`, `new_account_max_task_minor` and `new_account_max_withdraw_day_minor`, plus the self-dealing flag.
  - Admin: edit the limits, clear the flag for one user.
- **Onboarding answers.** Languages and intent (Hire or Earn), used for segments.

## 2. Task lifecycle
- **Post.** Table `tasks` holds:
  - kind (remote or local), category, difficulty and due date;
  - private address in `task_private`, photos, and 2 to 6 milestones (a checklist only);
  - topup_pct, repeat, crew_size, flash_until, live_answer, `hunt_*` and preferred_worker.
  - Caps: `post_cap_day` and `post_cap_new_day`.
  - RPC ✓ hide and unhide task.
  - Admin: view any task (private address only with an audit entry), edit, hide, change category, pause.
- **Text and video checks.** Table `task_moderation`. Admin: moderation queue.
- **Questions on a task.** Table `task_questions`. RPC ✓ `admin_task_question_hide`.
- **Offers and counter-offers.** Table `bids`, one quote per task. A counter-offer can name a finish date, a time "in N hours", or ask for more time.
  - Admin: offer history, remove an abusive offer.
- **Hire.** Tables `assignments` and auto-accept, plus hire guards. Admin: force-unassign.
- **Start, proof, revision and complete.** Table `task_proofs` (photos, PIN unlock). The cron `auto-complete-due` runs every 15 minutes.
  - Admin: view the proof, force-complete, force-release.
- **Cancel.** A fine of 5% applies after work starts. RPC ✓ `admin_cancel_task_with_refund`.
  - Admin: cancel with refund, waive the fine.
- **Disputes.** Tables `task_disputes` and `dispute_decisions`, with reasons and the 4.9 policy. RPC ✓ `admin_resolve_dispute`.
  - Admin: queue, evidence (chat and proof), decide release, refund or split.
- **Top-ups and the topped-up badge.** Setting `min_topup_minor`. Admin: refund a top-up.
- **Overdue tasks.** Fields `due_lapsed_at` and task reminders. Admin: overdue list, nudge or cancel.
- **Smart search.** Uses `task_embeddings` and handles meaning, Hinglish and typos.
  - Admin: tune `search_semantic_min`, re-index.
- **Promotions.** Tables `task_promotions` and `ad_events`.
  - Meta-style bidding with a flat price, 8 spots per area, no stop and no refund.
  - Settings `promotion_bidding`, `promotion_daily_budgets_minor`, `promotion_durations_days` and `ad_*`.
  - RPC ✓ pause and ROI.
- Home templates, poster ideas and poster options are written into the code today (no config).

## 3. Money (Plan B, Razorpay only). Most critical.
- **Switches.**
  - `money_flow`: wallet or plan_b.
  - `money_provider`: simulated or razorpay.
  - `money_paused`: RPC ✓ `admin_set_money_paused`.
  - `plan_b_unpaid_hours`.
  - Only the owner may change these, and only with MFA.
- **Pay per task (hold).** Tables `payments`, `task_holds`, `money_ledger` (append-only) and `money_webhook_events`. Edge functions `razorpay`, `razorpay-webhook` and `money`.
  - Admin: hold state for each task, webhook log, unpaid tasks that expired.
- **Release and refund moves.** Queue RPCs `plan_b_*`, run by Inngest `money-moves` every hour. Alert `money.move_failed`. RPC ✓ `admin_plan_b_overview` and `admin_plan_b_retry_move`. **UI?**
  - Admin: move queue, retry a failed move.
- **Reconciliation.** Tables `money_match_runs` and `reconciliation_runs`, nightly at 02:30 IST. Alert `money.mismatch`. RPC ✓ `admin_reconcile`.
- **Fees.** Worker commission 10%, poster fee 3%, cancel fine 5%. Settings `worker_commission_pct` and `clearing_period_days`. Revenue comes from `platform_ledger`.
- **Legacy wallet mode.** Wallets, payouts and RazorpayX; the payout queue already exists in the admin.
- **Refunds.** Tables `escrow_refunds` and `refund_ref`.
- **Coupons.** Not built.

## 4. Reviews
- Tables `reviews` and `review_moderation`. RPC ✓ hide and unhide.
- Admin: flagged reviews, recalculate totals.

## 5. Safety
- **Reports.** RPC ✓ `admin_resolve_report`. Admin: queue, then hide, warn or suspend.
- **Blocks.** Admin: see block patterns.
- **Copyright.** RPC ✓ for all actions.
- **Safety alarm.** Inngest runs it hourly. Admin: alarm inbox.
- **Contact phone on a task.** Admin: audit of who viewed a number.

## 6. Chat
- **Task chat.** Open only while the task is locked, plus 48 hours after it ends; then the chat is purged by cron. Chat photos are a switch. RPC ✓ hide and unhide a message.
  - Admin: read a thread only for a dispute or report case (with an audit entry), hide a message, change the purge window.
- **Crew messages (Together).** Same moderation as task chat.
- **Support tickets.** Admin: inbox, reply, resolve, assign to staff.

## 7. Notifications and jobs
- **In-app notifications and broadcast.** Tables `crm_broadcasts` and `broadcast_by_platform`.
- **Push.** Table `push_tokens` and setting `push_via_inngest`. Admin: test push, cleanup of dead tokens.
- **Email sequences (Loops).** Not built.
- **Inngest.** Outbox sweeper, job-failure report, team-alert (6 alert events), media purge and user sync. Staging is on the Hobby limit.
- **pg_cron jobs:**
  - job-watchdog, housekeeping, outbox-prune, user-sync-repair, crm-rules;
  - overdue-tasks, task-reminders, sms-pumping-watch, daily-digest, public-snapshots;
  - outbox-watchdog, auto-complete-due, settle-cleared-often, settle-finished-campaigns, chat-purge.
  - Admin: job health with last run and failures, pause a job, run it now.
- Admin alerts, live feed, audit log and CRM tables already exist.

## 8. Feedback board
- Posts, votes, comments and attachments (photos up to 1 MB, PDFs up to 2 MB). Caps `feedback_cap_day` and `feedback_cap_new_day`. RPC ✓ status, reply and hide.
- Admin: also merge duplicates (not built).

## 9. Map and areas
- **Task pins.** Ops `tasksNear`, `nearbyPulse` and `urgentTasks`. Admin: exact pin (with an audit entry), heat map by area.
- **People layer.** Removed from the app, but the ops still serve old app versions. Admin: clear a user's spot.
- **Area search.** Nominatim, then Photon, then a capped Google backup. Settings `places_daily_cap` and `places_user_daily_cap`.
  - Admin: quota use, change the caps.
- **Launch areas and cities.** Not built: only plan item 4.6. Candidate config: allowed areas plus a "coming soon" message.
- **Marketplace numbers.** `admin_marketplace_numbers` (time to first offer and fill rate by category and area), plus funnel and retention.

## 10. Together, City Hunt, Big Days, Only on TaskDrop
- **City Hunt.** Tables `hunt_finds` and `hunt_lookers`. Admin: moderate find photos.
- Big Days, Only on TaskDrop ideas, explainers, walkthrough and landing art are all written into the code. The walkthrough's YouTube link is still missing.
  - Candidate: a small content CMS.

## 11. Home content
- Settings `highlights` and `trending` (Just posted ticker, live numbers), plus a public snapshots cache.
- App controls for the banner: `banner_text`, `banner_level`, `banner_link` and `banner_ends_at`.

## 12. Guest mode
- Guest reads (migrations 146 and 151 plus hardening).
- Admin: guest-to-signup funnel, a switch to turn guest reads off (does not exist yet).

## 13. Legal
- Terms and Privacy are written into the code, with no versions in the database. The consent bar uses local storage only.
- Candidate: store which terms version each user accepted, and a prompt to accept again.

## 14. Media (ImageKit)
- Table `media`; settings `media_bytes_day` and `media_uploads_day`. RPC ✓ hide and unhide media. Inngest purge.

## 15. Switches, config and staff
- **app_controls:**
  - maintenance and its message, min_version, update_required and update_url;
  - signups_open and each sign-in method (phone, Google, Apple, password);
  - posting, bidding, top-ups, withdrawals, promotions, chat_photos, require_phone_verified;
  - environment and the banner fields.
- **settings:**
  - `dev_otp_for_all`: **ON, must be OFF before launch**;
  - `sms_daily_cap`, `sms_phone_daily_cap`, `sms_account_reserve_pct`;
  - `ai_daily_credits`; `n8n_*` (dead keys);
  - admin session hours and idle minutes, `admin_require_mfa`.
- **Staff roles.** Table `admin_staff`. RPC ✓ set staff and performance.

## 16. Security
- API rate limits, spend limits, repeat keys and abuse caps. Admin: throttled users, raise one user's limit.
- Sign-in: `auth_codes`, `auth_send_log`, `sms_daily` and `password_attempts`. Admin: unlock a phone or user, SMS-pumping alerts.
- App Check: enforcement deferred. Admin: show its state.

## 17. App versions
- `min_version`, `update_required`, edge function `app-download` (APK). OTA updates go through EAS.

## 18. Errors, data and analytics
- Sentry covers the app, server and admin.
- **Fake data:** 120 fake people (ids `fa4e0001-*`, phone numbers starting 98880), and `demo_seed_log`.
  - Admin: a "hide test data" filter on every list, purge, keep them out of stats.
- DataFast is not built. Internal views: funnel, retention, business daily, marketplace numbers and `ai_usage`.

## Changes from 28 Oct to 28 Nov (where the admin likely lags)
- Plan B money (migration 195) and money sweeps on pg_cron (migrations 198 to 202).
- Promotions rework (203): bidding, 8 spots, no refund.
- Chat window (206): open while locked plus 48 hours, then deleted.
- Counter-offers (216 and 227).
- Smart search (223).
- User skills catalog (226 and 228).
- Feedback attachments.
- Notify-a-helper (230).
- "New user" names (242).
- Earn goal and weekly goal.
- Task top-up raise.
- Guest mode.
- City Hunt and Big Days.
- Map D33.
- Home: idea templates, the Only on TaskDrop section, Just posted ticker, Home chips, pay-protected card, one-tap login phase 1.
- Walkthrough page and desktop layout.
- Places search fallback.
- Questions on tasks, nearby pulse, saved tasks.
- Security: session cutoff, `/api/<group>/<op>`, repeat keys, spend limits, SMS caps, new-account limits, data stored in India, consent bar.
- Cloudflare Workers web hosting.

## Gaps needing an owner decision
- Not built: launch areas, coupons, Loops, DataFast, legal version tracking.
- Content still written into the code: Home ideas, templates, Big Days, explainers, walkthrough YouTube link.
- `dev_otp_for_all` is still ON.
