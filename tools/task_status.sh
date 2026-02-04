#!/usr/bin/env bash
set -euo pipefail

TASKS_FILE="docs/AGENT_TASKS.md"
CLAIMS_DIR="docs/claims"

if [ ! -f "${TASKS_FILE}" ]; then
  echo "Missing ${TASKS_FILE}"
  exit 1
fi

if [ ! -d "${CLAIMS_DIR}" ]; then
  echo "No claims directory (${CLAIMS_DIR})"
  exit 1
fi

printf "\n%-6s %-18s %-12s %-20s %s\n" "Task" "Status" "Owner" "Claimed" "Title"
printf "%-6s %-18s %-12s %-20s %s\n" "----" "------" "-----" "------" "-----"

awk '
  BEGIN { task_id=""; title=""; status=""; }
  /^## Task [0-9]+:/ {
    task_id=$3; sub(":", "", task_id);
    title=$0; sub(/^## Task [0-9]+: /, "", title);
    status="";
  }
  /^Status:/ { status=$0; sub(/^Status: /, "", status); }
  /^Acceptance:/ {
    if (task_id != "") {
      print task_id "|" status "|" title;
    }
  }
' "${TASKS_FILE}" | while IFS='|' read -r id status title; do
  lock="${CLAIMS_DIR}/task-${id}.lock/claim.txt"
  owner=""
  date=""
  if [ -f "${lock}" ]; then
    owner="$(awk -F= '/claimed_by=/{print $2}' "${lock}")"
    date="$(awk -F= '/claimed_on=/{print $2}' "${lock}")"
  fi
  printf "%-6s %-18s %-12s %-20s %s\n" "${id}" "${status:-unclaimed}" "${owner:-}" "${date:-}" "${title}"
done

echo ""
