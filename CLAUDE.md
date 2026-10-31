# TaskDrop admin: agent guide

The admin panel (Next.js 16, port 3001) controls the user apps; the server enforces everything. The user app and the plan live in the other repo, `../Taskdrop user` (`AGENTS.md`, `docs/ULTIMATE_PLAN.md`).

## Branches and merging

- `main` is never altered by agents. All work goes into `redesigned-2.0` through a short-lived branch and a PR.
- **Push, open the PR and merge it without asking (owner, 2026-10-31).** Once the checks pass, push the branch, open the PR into `redesigned-2.0` and merge it (`gh pr merge N --merge --delete-branch`). Do not ask permission to merge and do not poll CI: check it once when the app wakes you or at the next natural point, and fix it straight away if it turns red.
- **Still ask first** before: deploying or publishing to testers, a wipe or reset, rotating any key, anything on `main` or on production.
- Never touch another session's uncommitted files; use a separate `git worktree` when the folder is on someone else's branch.

## Rules

- Staging is a test copy with fake data; `admin.taskdrop.in` is production's and is not used for staging.
- Never read, print or commit secret values. Use `.env.example` for shape.
