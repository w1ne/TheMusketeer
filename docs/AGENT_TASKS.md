# Agent Task Queue

This file is the shared task board for agents. Claims are enforced by a lock directory.

Claiming rules (mutex enforced):
1. Claim a task with `tools/claim_task.sh <task-id> <name>`. This creates `docs/claims/task-<id>.lock` atomically.
2. If the claim command fails, the task is already taken. Pick another task.
3. Do not edit `Status:` manually when claiming. The script updates it.
4. Immediately append a short entry to `docs/AGENT_REPORTS.md` with `Status: in progress`.
5. When finished or blocked, append a final report to `docs/AGENT_REPORTS.md`.
6. Mark completion with `tools/complete_task.sh <task-id> <name>`. The lock stays to prevent re-claim.

Enforcement: work is considered invalid unless the lock directory exists for that task.

Adding tasks (for coordinators/agents):
1. Add new tasks at the end of this file to avoid merge conflicts.
2. Use the template below and increment the task ID (next unused number).
3. Set `Status:` to `unclaimed`.
4. Include scope, primary files, and acceptance criteria.
5. Do not create or edit lock files when adding tasks.


---

## Tasks

Add tasks below using this template:

```
## Task <id>: <title>
Status: unclaimed
Scope:
- ...
Primary files:
- ...
Acceptance:
- ...
```
