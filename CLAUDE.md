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
- **Security review before every merge (plan task 2.6, user repo):** run the `security-review` skill on the diff of each pull request and fix every Critical or High finding first; say in the PR what it found.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
