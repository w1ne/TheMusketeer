# thepuppeteer

A tiny, file‑based task mutex system for coordinating multiple agents.

## Quick start

1. Add tasks to `docs/AGENT_TASKS.md`.
2. Agents claim with:
   ```bash
   tools/claim_task.sh <task-id> <name>
   ```
3. Reports are written to `docs/agent_reports/` (one file per report).
4. When done:
   ```bash
   tools/complete_task.sh <task-id> <name>
   ```
5. View status:
   ```bash
   tools/task_status.sh
   ```

Locks are enforced via `docs/claims/task-<id>.lock/`.

Check current claims:
```bash
tools/task_status.sh
```

Sanity-check claims and reports:
```bash
tools/validate_tasks.sh
```

## Bootstrap in Another Repo

Use this repo as a submodule and keep **tasks and reports local** to the target repo.

1. Add the submodule:
   ```bash
   git submodule add git@github.com:w1ne/thepuppeteer.git tools/thepuppeteer
   git submodule update --init --recursive
   ```

2. Bootstrap task files into your repo:
   ```bash
   tools/thepuppeteer/tools/bootstrap_repo.sh
   ```

Optional flags:
- `--target <repo-root>`
- `--force` (overwrite existing files)

3. Use the scripts via the submodule path:
   ```bash
   tools/thepuppeteer/tools/claim_task.sh <task-id> <name>
   tools/thepuppeteer/tools/complete_task.sh <task-id> <name>
   tools/thepuppeteer/tools/task_status.sh
   tools/thepuppeteer/tools/validate_tasks.sh
   tools/thepuppeteer/tools/generate_reports_index.sh
   ```

4. Update the submodule when you want new tooling:
   ```bash
   git submodule update --remote --merge
   ```

--------------------
What we want
- feedabck of agents, conrol panel with color coding.
- automatic report on stuck agents/uncomplete tasks.
- more rubuts mechanism on taking taksks, and garabage collectors of taks whih where finished but not relesed th lock. Tasks should have some kind of timeout and agents should be able to speak to each other.
- how to sync agents beayoind one machine, we wan to have several agents warking in the same rpo, communicating.
