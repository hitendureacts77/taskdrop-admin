# SUMMARY (read first)
- Signed in via Google (owner admin account), walked 37 routes + job, person (5 tabs), payout and help-request detail pages. No data-changing control clicked.
- No "run migration X" notice anywhere; System health lists migrations 066/071/085/087 as passing.
- Surprises: Developer sign-in (dev_otp_for_all) ON warning; authenticator 0 of 6 staff; 5 of 6 staff "Not on allowlist"; RazorpayX not connected (all withdrawals by hand, 23 waiting up to 55 days, one "Locked"); Money check 140 open problems (~107 "Finished with no commission booked", 16 "Paid but not credited"); Razorpay nightly check always "0 checked"; nightly checks gap 16-27 Nov; 324 unread alerts (83 self_dealing, 7 "Background jobs are not receiving events", job_failed); money_provider=simulated; server Environment shows "preview"; idle sign-out says 30 min but setting is 90; leftover "=1+1" tag; Plan-B leftovers still shown (Wallet top-ups switch, "Topped up" rule, min_topup_minor, "Wallet top-ups" report card); raw snake_case keys/kind codes/UUIDs shown to staff; some pages lack breadcrumbs (reports-queue, alerts, copyright, feedback, catalog, team/performance, crm/tasks).
- Extra sidebar item not in the brief: "Skills & categories" (/catalog).

# Live admin walk (staging, admin.taskdrop.in) - 28 Nov 2026

Read-only walk, signed in with Google (owner admin account). Fake data; names left out, counts and labels only.

## Shell (every page)
- Top yellow strip: "Staging: fake money and fake data".
- Top bar: search box "Search jobs and people"; pill "Live"; pill "Turn on alerts" (chime + desktop notification); pill "Payouts" (link to /payouts, tooltip: withdrawals sent by RazorpayX or paid by hand); date "Sat, 28 Nov"; signed-in email (link to /security: "your sign-in and authenticator code"); "Sign out" button.
- Browser tab title carries a count, e.g. "(73) Dashboard · TaskDrop Admin" (73 = late items).
- Breadcrumb on each page ("Home › Dashboard").
- Sidebar (logo "TD TaskDrop / Admin panel"), groups and badges:
  - (top) Dashboard; Needs you now [82 waiting, 73 late]
  - MONEY: Earnings & escrow (/money); Payouts [23]; Refunds [1]; Money check (/money/reconcile)
  - PEOPLE & JOBS: Jobs (/tasks); People (/users); Devices; Disputes [58]; Reports (/reports-queue); Alerts; Help requests (/support); Copyright notices; Feedback board; Skills & categories; Promotions
  - CUSTOMERS (CRM): Customer hub; Follow-ups & pipeline; Leads; Segments; Messages
  - REPORTS & SETTINGS: Business reports; Team performance; Admin & configuration; Security
  - Footer text: "Staff only. Every money action asks you to confirm first."
- Note: "Skills & categories" is a sidebar item not in the brief's route list.

## Dashboard  `/`  title "Dashboard"
- Subtitle greeting with date. Right: "Money figures as of <time> · Refresh".
- "Right now - Updates by itself" tiles (each links to a filtered list): Online now (n, "n of them can work") -> /users?filter=online; Getting quotes (n, "0 quotes in the last hour") -> /tasks?filter=open; Hired & in progress -> filter=active; Overdue ("Past their due time") -> filter=overdue; Waiting for poster's OK -> filter=waiting; Open disputes ("Money frozen until you decide") -> /disputes; Help requests waiting -> /support; Posted today ("n new people today") -> filter=posted_today.
- "Needs you now" card: "Withdrawals, refunds, disputes, help requests and copyright notices, most urgent first." Badge "73 late". Rows: "Withdrawal of ₹X by <name>" / "Withdrawal · Pay by hand" / "N days late" / "waiting N days" / button "Open" (-> /payouts/<id>). Row tinted red when late. Link "See all 82".
- "TaskDrop's earnings": TODAY amount + "▲ x% more than yesterday"; IN TOTAL since 21 Sept 2026 amount "From 123 finished jobs, plus promotions"; links "Today's entries", "All earnings".
- "Held in escrow now" amount + explainer (worker gets 90%, TaskDrop keeps 10% + service fee); "+ 2 hired jobs not paid for yet (₹..)"; link "See the 90 jobs".
- "Paid out to people": TODAY · n PAYOUTS; IN TOTAL · 41 PAYOUTS; link "See every payout".
- "Withdrawals on the way" amount; "23 withdrawals already out of people's earnings... 23 need you"; link "See what needs you".
- Small stats: Jobs finished today; Jobs posted today; New people today; Workers available now ("Older 'available now' setting"); Waiting for poster's OK.
- "What TaskDrop earned" chart: range chips 7 days / This month / Last month / 3 months / 1 year / 5 years / All time; total + "▲ x% more than the same days in October"; two lines (this period vs same days last month); "Show these numbers as a table".
- "Where today's money came from" (3 tappable rows -> entries): Commission (10% of job price), Service fee (3% extra posters pay), Promotions; "Earned today" total.
- "Live feed - Everything happening in the app": button "Pause"; filter chips Everything / Jobs / Money / People / Help & safety; event rows with "x h ago" (posted, first quote, worker chosen, work started, proof sent, done waiting OK, approved, dispute opened, cancelled).
- "System health - Something needs a look." link "Details →": Nightly check: Our books (22 checked, "22 differences"); Nightly check: Razorpay ("0 checked", "All fine"); Money check ("140 open problems", "Needs a look"); App service (app-config) "OK · 814 ms"; Error tracking "Open Sentry".
- "Devices and tools" link "All devices →": Web / Android / iPhone-iPad with "% on the newest version reported (1.1.0)" + install counts; external links Sentry (errors), Inngest (background jobs), ImageKit (images).
- "Things to do - 3 need you": 23 withdrawals need you [Open]; 58 disputes need your decision [Decide]; 1 refund owed to posters [Review]; 0 people asked for help [Open].
- "Whose money is in TaskDrop's account": total + split; rows with explainers: TaskDrop's own earnings; Posters' money held for jobs (escrow); Earnings, ready to withdraw; Workers' earnings still clearing (7 days after approval); Withdrawals on their way; Refunds owed to posters.
- "Latest money movements" table, link "All entries →": columns When / What happened / Job or person / Amount / Status (e.g. "TaskDrop's").
- Odd: "Nightly check: Razorpay · 0 checked · All fine" (checked nothing). Money check shows 140 open problems, books show 22 differences. Lots of [e2e] test jobs in feed.

## Needs you now  `/needs-you`  title "Needs you now"
- Breadcrumb Home › Dashboard › Needs you now. Subtitle "Everything waiting on a person, most urgent first. This list updates by itself."
- Same "Needs you now" card as dashboard, full list (82 items), badge "73 late". No filters, tabs or search.
- Row types seen: Withdrawal ("Withdrawal of ₹X by <name>", sub "Withdrawal · Pay by hand" or "Withdrawal · Not sent to RazorpayX yet"); Dispute ("Decide '<job>'", sub "Dispute · <poster> and <worker> · ₹X frozen"); Refund ("Send ₹X back to <name>", sub "Refund · '<job>' was cancelled"). Help requests and copyright notices are included by design but none were waiting.
- Each row: due chip "N days late"/"N h late" or "N h left", "waiting N days", one button "Open".
- Observation: list is dominated by ~50 duplicate "[e2e] dispute"/"[e2e] planb dispute" test disputes; no way to filter by type or bulk-hide test rows.

## Earnings & escrow  `/money`  title "Earnings and escrow" (h1 "Earnings & escrow")
- Subtitle: "What TaskDrop has earned, the posters' money it is holding, and who every rupee in the account belongs to."
- Collapsible "How money moves through TaskDrop" (4 steps: poster pays price + 3% fee into escrow; worker marks done; poster approves or 3 days pass -> worker gets 90% in wallet, TaskDrop keeps 10% + fee; 7 days later worker can withdraw via RazorpayX or by hand, follow on Payouts).
- Section "1. What TaskDrop earned": Earned today (+% vs yesterday, link "Today's entries →"); November so far (+% vs same days in October, "Entries →"); Earned in total (since 21 Sept 2026 · n finished jobs, "All entries →").
- "Where the earnings came from" table: Type / Today / November so far / In total (rows Commission 10%, Service fee, Promotions, Total; cells link to filtered entries).
- "Earnings over time" chart, range links 7 days / This month / Last month / 3 months / 1 year / 5 years / All time (?range=7d|month|lastmonth|3m|1y|5y|all); "Show these numbers as a table" (When / <period> / Same days in October).
- Section "2. Money in escrow (held for posters)": links "See these jobs →" (/tasks?filter=escrow), "Jobs waiting for the poster →", "Hired jobs →"; table Job / Poster / Worker / Status / Held / What happens next.
- Section "3. Who the money in the account belongs to": rows (TaskDrop's own earnings, escrow, Earnings ready to withdraw -> /users?filter=money, still clearing, withdrawals on their way, Refunds owed to posters -> /refunds).
- "Latest earnings entries" table: When / Type / Job / Amount, "All entries →".

## Earnings entries  `/money/entries`  title "Earnings entries"
- Breadcrumb Home › Earnings & escrow › Entries. Subtitle "Every rupee TaskDrop has earned, one line per earning, with the job it came from."
- Period filter links: Today / Last 7 days / This month / Last month / All time (?when=).
- Type filter links: All types / Commission / Service fee / Promotions / Corrections.
- Heading echoes filter ("All types · All time"); summary "50 entries on this page, adding up to ₹X".
- Table: When / Type / Job (link) / Note (e.g. "commission on completed order") / Amount. 50 rows per page (paging not checked further).

## Payouts  `/payouts`  title "Payouts"
- Subtitle "Workers and posters asking for their money. Pay each one from your UPI app or bank, then record it." Search box "Find a person" + "Search" button.
- Stat tiles (anchor links): Waiting for you (n, ₹) -> #queue; On the way ("Nothing in flight") -> #on-the-way; Paid today (₹, n payouts) -> #history; Ready to withdraw (₹, "Earnings people can still ask for") -> /users?filter=money.
- "Needs you · 23": "₹X to pay · oldest asked 55 days ago. Press Pay to see the QR code and account, then record it." Table: Person (name + role tag "Worker + poster") / Asked / Pay to (UPI id or BANK acct + IFSC, with "Copy UPI id"/"Copy account number" buttons) / Amount / Status ("Waiting", "Locked 55 days: pay or give back") / row button "Pay" (-> /payouts/<id>).
- "Settled" history with tabs: All / Paid / Came back / Cancelled (counts) and "Older →" paging; columns When / Result / Reference or reason / Requested ...
- "Withdrawal requests per day" chart: 7 / 30 / 90 days, "Show these numbers as a table".
- "How withdrawals are paid": button "Set up RazorpayX first" (RazorpayX not connected).
- "Money position": In RazorpayX "Not connected"; Ready to withdraw; Still clearing; On the way; Held for people; TaskDrop's own "—"; "Full breakdown →" (/money#whose). Collapsible "How it works".
- Note: RazorpayX shows "Not connected" -> all withdrawals are pay-by-hand.

## Refunds  `/refunds`  title "Refunds"
- Subtitle "Posters' money from cancelled jobs that still has to go back to them." Collapsible "How it works" (3 steps: owed = paid minus what was paid to worker; "Send refund asks Razorpay to return it... amount worked out by the database, not typed in"; marked refunded only after Razorpay accepts; 5-7 working days).
- Heading "1 refund owed", "₹X in total. Oldest first."
- Table: Job / Poster / Paid / Kept for worker / Owed back / Cancelled / Razorpay payment ("—") / row button "Send refund".

## Money check  `/money/reconcile`  title "Money check"
- Breadcrumb Home › Money › Money check. Subtitle "Things in <30-day range> that don't add up inside TaskDrop's own records, plus anything still open from before then. Our books are checked every night; payments from the last 3 days are also compared with Razorpay's payment links."
- Range links: Last 7 days / Last 30 days / Last 90 days (?days=).
- "Nightly checks" list (newest first; each row is an expandable button): "<date>, 02:30 am · Razorpay|Our books · <date range> · n checked · All fine | n differences".
- "Summary" section (counts per problem type).
- "What to look at" table (140 rows): Problem (severity tag "Important" or "Check" + problem name + subject link) / When / Amount / Detail. Problem types seen: "Finished with no commission booked" (Important, ~107, links to job), "Paid but not credited" (Important, 16), "Payment never completed" (Check, 15, "Payment link created and never paid"), "Withdrawal waiting too long" (Check, 23, links to payout).
- Odd: Razorpay nightly check always "0 checked · All fine"; Our books "22/28 differences"; nightly checks have a gap 16 Nov -> 27 Nov (Inngest limit?); many rows say "Payment (no longer readable)" (subject can't be shown).

## Jobs  `/tasks`  title "Jobs"
- Subtitle "Every job on TaskDrop. Click a job to see its money, people and timeline." Search "Search jobs by title" + "Search".
- Filter tabs (links ?filter=): All jobs / Money held (escrow) / Getting quotes (open) / Hired & in progress (active) / Overdue / Waiting for poster's OK (waiting) / Disputed / Finished / Cancelled / Posted today / Finished today.
- Heading "All jobs · 1,158 jobs". Table: Job (title + "Posted <date>") / Poster (link) / Worker (link or "Not hired") / Status / Price ("₹X budget" or "₹X agreed") / Held now / Last change. Paging "Showing 1–30 of 1,158" + "Older →" (?page=). No per-row action buttons; row opens /tasks/<id>.

## People  `/users`  title "People"
- Subtitle "Everyone who uses TaskDrop, as a poster, a worker or both. Click a name to see their jobs, wallet and payouts." Search "Search by name or username" + "Search". Link "Download spreadsheet" (-> /api/crm/export?...).
- Filter tabs (?filter=): Everyone / Joined today (new_today) / Online now / Available now / Workers / Money in wallet / Admins / Suspended / Deleted.
- Tag filter: "Tag: Any" + tag chips with counts (?tag=<id>). Only tag present is literally named "=1+1" (count 0) - looks like a leftover formula-injection test tag.
- Heading "Everyone · 247 people". Table: Name (avatar initials, name, @username · city) / Does (Poster / Worker chips) / Rating ("No reviews") / Wallet / Joined / Last seen. Paging "Showing 1–30 of 247" + "Older →". Many "E2E Newcomer" test accounts at top.

## Devices  `/devices`  title "Devices"
- Subtitle "Installs the apps have reported: where people are, which app version they run and who is behind the minimum version."
- "By platform": "n installs in total"; cards Web / Android / iPhone-iPad (installs, people, last seen, "% on the newest version reported (x)"). Note "A person using two app versions is counted once for each. The minimum version is set under Web, Android & iOS in settings."
- "By app version" table: Platform / Version / Devices / People / Last seen / Status ("Latest" or "—"). Link "Set the minimum version →" (/settings/controls).

## Disputes  `/disputes`  title "Disputes"
- Subtitle "Jobs where the poster and the worker disagree. The money stays frozen until you decide." Collapsible "How it works" (open job and read; Pay the worker; Refund the poster -> job cancelled, everything incl. service fee back to their TaskDrop wallet; older card-paid job shows up in Refunds instead, link /refunds).
- Heading "58 open disputes", "₹X frozen in escrow. Oldest first."
- Table: Job / Poster / Worker / Reason given (quote · who raised it) / Frozen / Waiting / row link "Decide". No filters/search. 50+ rows are "[e2e] dispute" test rows.

## Reports (queue)  `/reports-queue`  title "Reports queue" (h1 "Reports")
- No breadcrumb on this page (other pages have one). Subtitle "Things people flagged as wrong. Look, decide, and close each one."
- Tabs: Open / Handled (?view=done).
- Card per report: "Job #<short id>" (link to job), "Reported by <name> · n days ago", quoted reason, buttons "Mark acted on" / "Dismiss". 1 open report.

## Alerts  `/alerts`  title "Alerts"
- No breadcrumb. Subtitle "Messages the background jobs left for the team: waiting withdrawals, failed payouts, help requests, disputes and the daily digest."
- Tabs: Unread (324) / All (?view=all). "Showing the latest 100 of 324 unread · Newest first. Mark these as read to see the older ones." Button "Mark all as read"; per item "Mark read".
- Item = title + kind code shown raw (e.g. "self_dealing", "job_failed", "outbox_stuck", "reconcile") + body text + age. Kinds in latest 100: "A job may be paid between two accounts of one person" (self_dealing, 83; body shows raw job UUID, says same device for poster and worker, "job is not blocked"); "Background job failed: job-watchdog / nightly-reconcile (3) / outbox-watchdog / settle-cleared-often"; "Background jobs are not receiving events" (outbox_stuck, 7); "Daily digest, <date>"; "Money check: n thing(s) do not add up".
- Odd: raw snake_case kind codes and raw UUIDs shown to staff; job IDs in alert text are not links; 7 "Background jobs are not receiving events" alerts.

## Help requests  `/support`  title "Help requests"
- Subtitle "Questions and problems people sent from the app. Open one to read it and reply."
- Tabs (?status=): Waiting for a reply / Answered / Resolved / All.
- Heading "0 conversations"; empty state "Nobody is waiting for a reply". (Answered/Resolved/All checked below under support ticket detail.)

## Copyright notices  `/copyright`  title "Copyright notices"
- No breadcrumb. Subtitle "Takedown requests sent to TaskDrop's designated copyright agent. Log each one here, then take the material down, or reject the notice."
- "Log a notice" form ("Copy it in from the agent's inbox as you received it."): Who sent it (name + company) / Their email / Their copyrighted work / Where it is on TaskDrop, in their words / The job it is on ("Paste the job link or id"; hint: needed to take down a job's photo or post, poster filled in from the job) / Or the person, for a profile photo ("Paste their People page link or id") / button "Log notice".
- Collapsible "What the law expects" (6 parts of a valid notice; take valid ones down quickly, nothing deleted - file detached and uploader told automatically; counter-notice: record + forward same day, restore...; at 3 upheld notices suspend the person).
- Lists: "Waiting for a decision" ("No notices are waiting."), "Taken down" ("Nothing is down at the moment."), "Closed" ("Nothing closed yet.").

## Feedback board  `/feedback`  title "Feedback board"
- No breadcrumb. Subtitle "Ideas people suggest in the app, most voted first. Set where each one stands: everyone who backed it is told when it is planned, started or live. Private notes are what people send with 'Send feedback': only staff see them."
- Tabs with counts (?tab=): New (2) / Under review (1) / Planned (1) / In progress (0) / Done (27) / Not planned (declined, 0) / Hidden (0) / Private notes (notes).
- Idea card: title; "<type e.g. New feature> · <author> · n days ago · n votes"; state "Open"; body; "n comments" toggle (expands comments, each with "Hide comment"); buttons "Set status" / "Reply" / "Hide".
- Sidebar also highlights /feedback sub-links (sidebar has /feedback repeated 8 times = tab links).

## Skills & categories  `/catalog`  title "Skills & categories"  (sidebar item not in the brief's list)
- No breadcrumb. Subtitle (Skills): "Ranked by how many workers have each skill. The app shows them in this order." (Categories: "Ranked by how many tasks are in each category.")
- Kind tabs: Skills / Categories (?kind=category).
- Filter tabs with counts: All (46 skills / 15 categories) / Added by workers (?f=added, 27) / New this week (?f=new, 46 - all of them, odd) / Hidden (?f=hidden, 0).
- Table: Rank / Skill (or Category) / Workers (or Tasks) / Came from ("Built in" or "Added by <name>, <date>") / Also matches (search phrases as chips each with "×" remove).
- Row actions: "Rename", "Add phrase"; worker-added rows also "Merge into…" and "Hide". Built-in rows have no Merge/Hide.

## Promotions  `/promotions`  title "Promotions"
- Subtitle "Posters paying to show their job higher. What they pay is TaskDrop's own earnings (the 'Promotions' line)."
- Stat cards: Showing now (n promoted jobs, "See them below →"); Paid for (latest 16) ₹X, "Promotion earnings →" (entries filtered to promotions).
- "Latest promotions" table: Job / Paid by / Amount / For (1 day / 3 days) / Status ("Showing now" / "Finished") / Runs (date range) / row button "Stop" on running ones.

## Customer hub  `/crm`  title "Customer hub" (h1 "Customers")
- Subtitle "Know your people: notes, tags, follow-ups, suspensions, and messages to the right group."
- Quick links: My customers (/crm/segments?owner=me) / Leads / Segments / Send a message (/crm/messages).
- Stat tiles: People (247) / Suspended (0) / Follow-ups waiting (0, "None due yet") / Messages sent (0).
- Collapsible "What you can do here".
- Sections: Follow-ups ("Reminders you set on a person's notes, soonest first"; empty "Nothing to follow up - Add a note on someone's page with a reminder date"); Recent notes ("0 in total"); Latest messages ("All messages →", "Nothing sent yet"); Suspended ("Can't sign in or withdraw. Their jobs and money are untouched."; "Nobody is suspended"); Tags ("Click a tag to see who has it", tag chip "=1+1 · 0 people" with "Delete" button).

## Follow-ups & pipeline  `/crm/tasks`  title "Follow-ups and pipeline"
- No breadcrumb. Subtitle "Things staff must do for customers, and where every customer is on the road from signing up to coming back."
- "Customer pipeline" (5 stage cards, link to segments): Signed up (n, % of everyone, "Joined, nothing else yet") / Engaged ("Posted a job or sent an offer", n at risk) / Funded ("Has a funded job, or was hired") / Completed one / Repeat ("Two or more finished jobs"). "At risk = not seen for 30 days after getting started."
- Tabs: Mine / Everyone's open (?view=all) / Done (?view=done). "Open follow-ups" empty "Nothing to do".
- "Add a follow-up" form: What needs doing (placeholder "Call about the stuck withdrawal") / Details (optional) / Due (date, optional) / Give to (staff select: lists staff accounts incl. dummy ones "Kiran (dummy support)", "Neha (dummy viewer)", "Priya (dummy finance)", "Test Admin (seed)") / button "Add follow-up". "You can also add one from a person's page."

## Leads  `/crm/leads`  title "Leads"
- Breadcrumb Home › Customers › Leads. Subtitle "People and businesses who are not in TaskDrop yet: who you have reached, who is interested, who said yes." Collapsible "How leads work".
- Stage tabs with counts (?stage=): All / New / Contacted / Talking / Won / Lost. Owner tabs: Anyone's / My leads / No owner; plus "Show leads of [select owner]" + "Show".
- "All leads · 0 shown"; empty "No leads yet - Add the first one from the form."
- "Add a lead" form ("Only the name is needed"): Name / Phone, email or link / Is a [Business|Person|Other] / Where you found them / Note / Looked after by [staff select] / button "Add lead".

## Segments  `/crm/segments`  title "Segments"
- Breadcrumb Home › Customers › Segments. Subtitle "Find a group of people by what they do. Preview it, save it, message it, or download it."
- Owner tabs: Everyone's customers / My customers (?owner=me) / No owner (?owner=nobody).
- "Find people" form ("Leave anything blank to ignore it. Suspended people are left out unless you tick the box."): Who [Everyone|Workers|People who only post]; Joined in the last (days); Not seen for (days); Has the tag [Any (or none)|tags]; Wallet holds at least (₹); Uses [Any platform|Android|iOS|Web]; App older than (e.g. 1.4.0); Looked after by [Anyone|Me|Nobody|staff...]; checkboxes Never posted a job / Available now / Include suspended; button "Show who matches".
- Result "247 people match": links "Message them" (/crm/messages?...) and "Download spreadsheet" (/api/crm/export?segment=1). Table with row checkboxes + "Select everyone on this page": Name / Does / Wallet / Joined / Last seen / Owner. Bulk bar "Look after them": [Choose an owner…|No owner|staff] + "Apply". Paging "Showing 1–30 of 247 · Older →".
- "Saved segments": "Counts are live. None yet. Pick some filters above and press 'Show who matches', then save the group." (No visible save button until filters are applied.)

## Messages  `/crm/messages`  title "Messages"
- Breadcrumb Home › Customers › Messages. Subtitle "Tell people something. It lands in their TaskDrop notifications, and phones with the app get a push."
- "Write a message" ("Nothing is sent until you review it and confirm. To message one person, open them from People."): Send to [Everyone (247) | All workers (110) | People who only post (137) | tag groups]; Title ("The first line they see"); Message ("Keep it short and useful", counter 0/500); button "Review and send".
- Collapsible "Good to know" (shows reach before send; max 5,000 people per message; suspended left out unless chosen; can't be taken back, history kept).
- "Sent so far": "Nothing sent yet."

## Business reports  `/reports`  title "Business reports" (h1 "Reports")
- Subtitle "How TaskDrop did over the last 30 days. Every number opens the list behind it." Range: 7 days / 30 days / 90 days / 1 year (?days=).
- "Money": Value of jobs finished ("Finished jobs →"); TaskDrop earned ("Earnings →"); tiles (each links to list): Jobs posted / Jobs finished / Jobs cancelled ("posted any time") / Getting quotes now / Open disputes / Quotes sent ("% of jobs got a quote") / New people / People in total (n active) / Average worker rating ★.
- "How the business is doing" (vs previous period): Paid in for jobs, TaskDrop earned, Take rate (earned ÷ paid in), Jobs finished, New people, ...; "Download as spreadsheet" (/api/reports/export?days=30); chart + "Show these numbers as a table" (When / Paid in for jobs / TaskDrop earned).
- "Health of the marketplace": Jobs finished ÷ posted (with "Before"), Cancelled ÷ posted, Disputes decided, Wallet top-ups.
- "Do tasks get offers, and get done?": Time to first offer (typical + slowest 1 in 10), Fill rate, Got at least one offer.
- "By category" table: Category / Posted / Got an offer / Typical wait / Slowest 1 in 10 / Filled.
- "By area" (15 areas as typed): Area / Posted / Got an offer / Typical wait / Slowest 1 in 10 / Filled. ("No area" is the biggest row.)
- "From joining to coming back" (funnel) and "Do people stay active?" cohort table: Joined in week of / People / Same week / +1 ... +8.
- "What the promotions earned": Promotions started (n running now) / Spent on views / Views / Taps (% of views).
- Odd: Cancelled ÷ posted 41% vs 1.94% before (test runs); "Wallet top-ups ₹0" (Plan B has no top-ups, card may be obsolete).

## Team performance  `/team/performance`  title "Team performance"
- No breadcrumb. Subtitle "What each member of staff did from <date> to <date>. This shows workload and speed; it is not a score to judge people by."
- Range: Last 7 / 30 / 90 days (?days=).
- Table: Person (link + role) / Follow-ups done / On time / Open / overdue / Notes / Help replies / First reply / Reports / Disputes / Customers owned. 6 staff rows, all ~0.

## Search  `/search?q=`  title "Search"
- Reached from the top-bar search. Breadcrumb Home › Search. Own search box + "Search".
- Sections "Jobs (n)" with "All →" (/tasks?q=) - rows: job title + status; "People (n)" with "All →" (/users?q=), empty "Nobody matches."
- Note: /search with no query was not opened separately; the result list shows up to 10 jobs.

## Admin & configuration (settings shell)  title "Admin & configuration"
- Breadcrumb Home › Admin & configuration. Subtitle "Who runs TaskDrop, the numbers and switches the app runs on, and how its systems are doing."
- Settings tabs: Team & access (/settings/team) / Money & timing (/settings) / App switches (/settings/switches) / Rules (/settings/rules) / Web, Android & iOS (/settings/controls) / Integrations (/settings/integrations) / System health (/settings/health) / Audit log (/settings/audit) / My security (/security).
- Sidebar "Admin & configuration" links to /settings/team.

## Settings · Team & access  `/settings/team`  title "Team and roles"
- Summary tiles: Team (6; "2 Admin · 1 Finance · 1 Support · 1 Sales · 1 Viewer"); Authenticator set up ("0 of 6", "needed to move money"); Panel sign-in ("Allowlist - Only the 1 account listed in ADMIN_EMAIL / ADMIN_PHONE get in").
- "Team" ("Adding, removing or changing someone's role asks for your authenticator code and is written to the audit log."): buttons "End all staff sessions", "+ Add admin".
- Table: Name (link, @username or "no username", "You" tag) / Signs in with (email) / Role (select Admin|Finance|Support|Sales|Viewer; own row fixed) + chips "Posts jobs"/"Works jobs" / Alerts (button "Staff alerts for <name>" toggle) / Panel access ("Can sign in" or "Not on allowlist") / Authenticator ("Not set up") / Last signed in / Actions ("Remove").
- "What each role can do" matrix: rows Admin/Finance/Support/Sales/Viewer ("Sees everything, changes nothing") x columns Money / People / Admin (e.g. "View only"); footnote defines Money (payouts, refunds, wallet changes, disputes), People (help, notes, follow-ups, tags, messages, leads, moderation, suspensions, copyright), Admin (settings, app switches, team, deleting accounts).
- Odd: staff list contains dummy accounts (Kiran/Neha/Priya dummy, Test Admin seed); 5 of 6 staff are "Not on allowlist" so they cannot actually sign in; nobody has an authenticator, so money actions needing a code would be blocked.

## Settings · Money & timing  `/settings`  title "Money and timing"
- Banner: "These change the app for everyone, straight away. The database reads them every time money moves, so a change here is live the moment you confirm it."
- "Money and timing - The numbers the whole app runs on. Every change asks you to confirm, and says what it affects." Each row: name, explainer, "Last changed <date>", value, button "Change" (some read-only):
  - Commission TaskDrop keeps = 10% (READ-ONLY: "Change it in a migration when nothing is clearing")
  - Service fee posters pay = 3%
  - Paid to the worker if a started job is cancelled = 5%
  - Days a poster has to approve = 3 days
  - Days before a worker can withdraw = 7 days
  - Longest video on a job post = 60 seconds
  - Sign-in codes a day = 500 (SMS cap; Google still works)
  - Biggest job a new account can post = ₹5,000 (grows per 4★+ finished job)
  - Most a new account can withdraw in a day = ₹5,000
  - Days an account counts as new = 30 days
  - Finished jobs that end "new" = 3
  - Promotion daily budgets = ₹50, ₹80, ₹150, ₹300
  - Promotion lengths = 1 day, 3 days, 7 days
  - Developer sign-in switch (dev_otp_for_all) = On (also shown here)
- "Advanced (ads pricing and others)" - "Read-only here. Change these in a database migration so the reason is recorded." Raw key/value list: ad_click_viewer_promo_day, ad_cpm_divisor, ad_ctr_prior, ad_ctr_smoothing, ad_events_keep_days, ad_impression_viewer_day, ad_impression_viewer_promo_day, ad_min_charge_minor, admin_require_mfa (Off), admin_session_hours (12), admin_session_idle_minutes (90), feedback_cap_day, feedback_cap_new_day, max_withdraw_minor, media_bytes_day, media_uploads_day, min_topup_minor, min_withdraw_minor, money_flow = plan_b, money_paused = Off, money_provider = simulated, payout_method = manual, places_daily_cap, places_user_daily_cap, plan_b_unpaid_hours = 24, post_cap_day, post_cap_new_day, promotion_bidding (compound), public_cache (app Off · memo On · snapshots On), public_snapshots_last_ok, push_via_inngest = On, search_semantic_min, sms_account_reserve_pct, sms_phone_daily_cap, ...
- Odd: raw snake_case keys and minor-unit numbers shown to staff; money_provider = "simulated" on staging; min_topup_minor still present though Plan B has no top-ups.

## Settings · App switches  `/settings/switches`  title "App switches"
- Red warnings at top: "Developer sign-in is ON. Anyone can sign in to any phone number's account. Switch it off before real people use TaskDrop." and "Do not turn on 'Authenticator code for money actions' yet. No admin has an authenticator set up (0 of 6). Turning this on would stop every money action for everyone. You have none yourself, so the panel will not let you turn it on."
- Switches (name, explainer, last changed, state, action):
  - Authenticator code for money actions = Off; action disabled: "Set up your authenticator first".
  - Developer sign-in (dev_otp_for_all) = On; button "Developer sign-in (dev_otp_for_all): turn off".
  - How withdrawals are paid = By hand; link "Change on Payouts".

## Settings · Rules  `/settings/rules`  title "Rules"
- "Automation rules": "A rule that is on creates follow-up tasks for customers automatically..." Rule cards: name, description ("Paid in, then nothing posted: A customer paid in money 7 days ago and ..."; "Dispute opened: A dispute was opened in the last 2 days: a follow-up is..."), "No follow-ups created yet", state Off, buttons "<rule>: turn on", "Edit" (inline form with "Save changes"), "Delete".
- Two rules exist: "Topped up but has not posted a job" (Off), "Dispute opened: follow up with the person" (Off).
- "Add a rule" ("It starts switched off."): Name (e.g. "Topped up but has not posted a job") / When [Paid in, then nothing posted | Dispute opened] / Days (1 to 90) / "Add rule".
- "Latest automation follow-ups" (10 newest): "None yet."
- Odd: rule wording "Topped up" refers to wallet top-ups, which Plan B removed.

## Settings · Web, Android & iOS  `/settings/controls`  title "App controls"
- Collapsible "How these work" ("Each column is one place the app runs. Everywhere applies to all of them...").
- "Switches" ("Click a switch, say why, and confirm. Withdrawals and top-ups also need your authenticator..."): matrix table What / Everywhere / Web / Android / iPhone-iPad; each cell is a toggle button. Rows: Maintenance mode; Require a verified phone number; New sign-ups; Sign in with phone; Sign in with Google; Sign in with Apple; Sign in with username and password; Posting jobs; Sending offers; Wallet top-ups; Withdrawals; Promoting jobs; Photos in chat. (All currently in normal state: maintenance off, verified phone off, everything else on.)
- "Wording, versions and banner" per platform (Everywhere/Web/Android/iPhone) with "Save for <platform>": maintenance message ("We'll be back soon."), minimum version ("No minimum"), update link ("https://…"), banner text ("No banner"), banner level [Information|Warning|Serious], banner ends at (date).
- "Devices" / "By app version" (same table as /devices).
- Odd: "Wallet top-ups" switch row still shown though Plan B has no wallet top-ups.

## Settings · Integrations  `/settings/integrations`  title "Integrations"
- Read-only status cards (no buttons):
  - Supabase: Connected; "Database, sign-in and file storage..."; Project <ref>; Answered in <ms>; Service key: Set ("Server-only key for the few things an admin session can't read: refunds...").
  - Panel sign-in: "Allowlist on"; "Google, or @username and password. Signs you out after 30 minutes idle"; Allowed account <email>.
  - RazorpayX payouts: Not set up; "Withdrawals paid: By hand".
  - Razorpay payments: Receiving ("Posters pay for jobs, top-ups and promotions through Razorpay checkout"); Last payment <age>.
  - Push notifications: Active; Phones registered: 2.
  - Footer: "Keys and secrets are never shown here. Change them in Vercel..."
- Odd: says "Signs you out after 30 minutes idle" but the settings value admin_session_idle_minutes = 90. Razorpay card still mentions "top-ups".

## Settings · System health  `/settings/health`  title "System health"
- Top status: "The checks below pass, but the Money check needs a look." + link "140 open problems in the Money check. Checked <time>".
- "Checks - Each feature, tested by reading the table or function it depends on": name / what is read / latency: Database (settings table), Money ledger (platform_ledger), Earnings totals (platform_earnings()), Payout queue (admin_payout_queue()), RazorpayX money position (admin_money_position() · migration 066), Customer hub CRM (crm_notes · migration 071), Copyright notices (copyright_notices · migration 085), Account deletion (account_deletions · migration 087), Audit log (admin_audit_log, ~3 s), Service key (SUPABASE_SERVICE_ROLE_KEY: Set). All passing - no "run migration X" warning shown.
- "Waiting for you": 82 in all; Payouts / Disputes / Refunds / Help requests counts (links).
- "Latest activity - If these stop moving, something upstream may be stuck.": Money moved / Job posted / Person joined / Help request (ages, links).
- "This server": Environment = preview; Version = <git sha>; Region = bom1; Node = v26.x.
- Odd: staging admin reports Environment "preview" (Vercel preview deployment), not "staging".

## Settings · Audit log  `/settings/audit`  title "Audit log"
- Subtitle "Every change to money, settings and admin access, recorded b(y the database)..."
- Area filter chips: Everything / Settings / Admin access / Payouts / Wallet changes / Dispute decisions / Suspensions / Messages sent / Copyright / Staff actions / Without heartbeats; who filter: Staff only / Every line.
- Table: When / Who (e.g. "Owner (database)") / Area / What happened (e.g. "Added <setting_key>: value", "Changed money_flow...", "Added wallet changes" + "About <person>" link) / Details ("Before / after" expander). Paging "Showing 1–40 of 289 · Older →".

## My security  `/security`  title "My security" (inside settings shell)
- "Authenticator app": explainer (signing in proves who you are once; moving money asks again with a phone code; "The requirement is switched off in Settings, so money actions do not need a code right now."; money actions = payouts, refunds, dispute decisions, wallet changes, settings and admin roles). Button "Set up authenticator app".

## Job detail  `/tasks/<id>`  title "Job"  (opened a disputed seed job)
- Breadcrumb Home › Jobs › <title>. H1 job title + status chip ("Disputed") + status explainer ("Poster and worker disagree. Money is frozen until an admin decides").
- "Why it was reported · <who> · <when>" + quoted reason.
- "Decide this dispute" ("Read the job, the quotes and the reviews first. Both choices..."): two option cards - "The work stands: pay <worker>" (₹ to worker wallet, button "Pay <worker>") and "Refund <poster>" (₹ incl. service fee back to poster wallet, button "Refund <poster>"). Link to /refunds for older card-paid jobs.
- "The money for this job": Agreed price (quote accepted) / Service fee paid by the poster (3%) / Poster paid in total / <worker> gets (90%) / TaskDrop will earn (10% + fee) / Where the money is now ("Frozen in escrow until an admin decides") / Razorpay payment (id or "—", "paid").
- "What the poster asked for": description + "Category · Remote/area · request type".
- "Quotes (n)" table: Worker / Price / Message / Sent (chosen one tagged "Chosen").
- "People": Poster / Worker (links).
- "Visibility": "Everyone who could see this job can see it." button "Hide this job".
- "Category": "Filed under <category>." button "Change category".
- "Timeline": Posted / <worker> hired / <poster> paid into escrow / Work started / Marked done by the worker / Approved, money released ("Not yet") / Worker can withdraw ("Not yet").
- "TaskDrop's earnings from this job": "Nothing booked yet. TaskDrop earns when the poster approves..."
- Footer: link "Find similar jobs →" (/tasks?q=<title>); "Job id <uuid> · checked <time>".
- Odd: seed job timeline out of order (paid into escrow 29 Oct before posted 31 Oct).

## Person detail  `/users/<id>`  title "Person"  (opened a seed account that is worker + poster)
- Breadcrumb Home › People › <name>. Header: avatar initials, name, role chips (Worker / Poster), "@username · area · joined <date>"; button "Suspend" (on every tab).
- Tabs: Overview / Money (?tab=money) / Follow-ups (?tab=followups) / Devices (?tab=devices) / Audit (?tab=audit).
- Overview:
  - "<name>'s wallet" ("Money TaskDrop holds for this person. It is theirs..."): Ready to withdraw (+ "Their withdrawals →" anchor #withdrawals); Still clearing ("Withdrawable 7 days after approval").
  - "Notes & follow-ups" ("Private to admins. Add a reminder date and it shows up in follow-ups"): Note textarea + "Remind me on" (date, optional) + "Save note"; list "No notes yet."
  - "Jobs <name> posted" table: Job / Status / Price / Posted.
  - "Jobs <name> worked on" table: Job / ... / Poster paid / Hired.
  - "<name>'s activity": event feed ("Posted a job · <title>" + time), newest first.
  - "Looked after by": owner select + "Save".
  - "Tags" ("Labels only admins see..."): list + input "Add a tag, e.g. VIP" + "Add tag".
  - "Message <name>": Title / Message (0/500) / "Review and send".
  - "Contact": Phone / Email (shown in full) + source note.
  - "Ratings": As a worker / As a poster.
  - "Withdrawals" ("Click one to see it, or pay it if it is waiting."): list or "Never withdrawn."
  - "Delete account" ("When someone asks through support, or to close an account for..."): blocked state "Can't delete it yet:" with reasons (wallet not at zero; a job in progress or in dispute; ...).
- Money tab: "<name>'s money at a glance" (Ready to withdraw / Still clearing / Paid in (shown payments) / Withdrawn (shown withdrawals)); "Payments in" table (When / For "Funding a job or topping up" / Status / Amount, latest 50); "Manual corrections" ("Changes an admin made to their wallet." - "None."; no visible add-correction form on this tab).
- Follow-ups tab: "Follow-ups about this person" list + "Add a follow-up" form (What needs doing / Details / Due / Give to / "Add follow-up").
- Devices tab: "Sign-in" (methods e.g. Phone code, Username + password; Last signed in; button "Sign out everywhere"); "Devices" list (platform, app version + user agent, first seen, last active).
- Audit tab: "Admin actions on this person - From the audit log. Newest first, the latest 50." Table When / Who / What (e.g. "Opened a person page with phone and email visible", "Gave them a role", "Took a role away", "Warned a person" + note).
- Notes: just opening a person page writes an audit line ("Opened a person page with phone and email visible"). A "Warn" action exists in the audit history but no "Warn" button was visible on the page (maybe inside the Suspend flow).

## Payout (withdrawal) detail  `/payouts/<id>`  title "Withdrawal"
- Breadcrumb Home › Payouts › ₹X to <name>. H1 "₹X withdrawal" + status chip ("You are sending it").
- "Asked by <name> · <role tag> · n days ago · ref <short id>".
- "Pay <name>" ("Two steps: send the money from your own UPI app or bank, then record it"):
  - Step 1 "Send ₹X to <name>": UPI QR ("Scan with any UPI app on your phone - PhonePe, Google Pay, Paytm or your bank's app"); UPI id + "Copy"; AMOUNT + "Copy"; link "On a phone? Open it in your UPI app"; note "Locked: <name> can no longer cancel it."
  - Step 2 "Record that you paid" ("Pick how you sent it and type the reference your UPI app or bank shows"): buttons "Paid by UPI" / "Paid by bank transfer" / "Paid another way".
  - "! Can't pay it?" button "It didn't go through".
- "Details": Amount / Status / Asked for / Last change / Sent to (UPI · id) / Paid ("Not paid yet · by hand") / Withdrawal id + "Copy".
- "Who asked": Name / Uses TaskDrop as / Earnings left to withdraw / link "Open <name>'s page: jobs, wallet, message them".
- "<name>'s other withdrawals": list of amount / date / status ("Waiting for you to send", "<name> cancelled · back in their earnings", "Sent to <name>"), each links to its payout page.

## Help request detail  `/support/<id>`  title "Help request"
- List `/support?status=all` columns: Subject / From / About (bug, payment...) / Status / Last message. 5 tickets, all Resolved test tickets.
- Detail: breadcrumb Home › Help requests › <subject>; H1 subject + status chip ("Resolved"); "From <name> · about <topic> · opened <date>" (name links to person).
- "Conversation": messages with author + time.
- "Reply to <name>" ("They get a notification in the app."): textarea "Write your reply…" + "Send reply".
- "Done?" ("Resolve it when there's nothing left to do. They can still write...") - shows "Already resolved." (resolve button only when open).

## Not walked / limits
- No item clicked that changes data; no dropdown that writes was used. Feedback "Private notes" tab, Segments save flow, CRM tag pages, Reports-queue "Handled" tab and People sub-filters were not opened one by one.
- Visiting a person page writes an audit line (read-access log), by design.
