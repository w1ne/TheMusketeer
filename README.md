# thepuppeteer

A tiny, file‑based task mutex system for coordinating multiple agents.

## Quick start

1. Add tasks to `docs/AGENT_TASKS.md`.
2. Agents claim with:
   ```bash
   tools/claim_task.sh <task-id> <name>
   ```
3. Agents log progress in `docs/AGENT_REPORTS.md`.
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

2. Copy templates into your repo (each repo owns its own task/status files):
   ```bash
   cp tools/thepuppeteer/docs/AGENT_TASKS.md docs/AGENT_TASKS.md
   cp tools/thepuppeteer/docs/AGENT_REPORTS.md docs/AGENT_REPORTS.md
   mkdir -p docs/claims
   cp tools/thepuppeteer/docs/claims/README.md docs/claims/README.md
   printf "task-*.lock/\n" > docs/claims/.gitignore
   ```

3. Use the scripts via the submodule path:
   ```bash
   tools/thepuppeteer/tools/claim_task.sh <task-id> <name>
   tools/thepuppeteer/tools/complete_task.sh <task-id> <name>
   tools/thepuppeteer/tools/task_status.sh
   tools/thepuppeteer/tools/validate_tasks.sh
   ```

4. Update the submodule when you want new tooling:
   ```bash
   git submodule update --remote --merge
   ```

## Bootstrap in Another Repo (Script)

After adding the submodule, run:

```bash
tools/thepuppeteer/tools/bootstrap_repo.sh
```

Optional flags:
- `--target <repo-root>`
- `--force` (overwrite existing task files)
