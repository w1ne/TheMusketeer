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
