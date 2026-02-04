#!/usr/bin/env bash
set -euo pipefail

TASKS_FILE="docs/AGENT_TASKS.md"
REPORTS_DIR="docs/agent_reports"
CLAIMS_DIR="docs/claims"

if [ ! -f "${TASKS_FILE}" ]; then
  echo "Missing ${TASKS_FILE}"
  exit 1
fi

if [ ! -d "${CLAIMS_DIR}" ]; then
  echo "Missing ${CLAIMS_DIR}"
  exit 1
fi

mkdir -p "${REPORTS_DIR}"

errors=0

has_in_progress_report() {
  local id="$1"
  if compgen -G "${REPORTS_DIR}/*_task-${id}_*start.md" > /dev/null; then
    return 0
  fi
  return 1
}

while IFS='|' read -r id status title; do
  lock="${CLAIMS_DIR}/task-${id}.lock/claim.txt"
  if [[ "${status}" == claimed\ by* ]]; then
    if [ ! -f "${lock}" ]; then
      echo "ERROR: Task ${id} claimed but no lock file."
      errors=$((errors + 1))
      continue
    fi
    owner="$(awk -F= '/claimed_by=/{print $2}' "${lock}")"
    status_owner="$(printf "%s" "${status}" | sed -E 's/^claimed by ([^ ]+).*/\1/')"
    if [ -n "${owner}" ] && [ "${owner}" != "${status_owner}" ]; then
      echo "ERROR: Task ${id} owner mismatch. Status=${status_owner}, Lock=${owner}"
      errors=$((errors + 1))
    fi
    if ! has_in_progress_report "${id}"; then
      echo "ERROR: Task ${id} claimed but no in-progress report file found."
      errors=$((errors + 1))
    fi
  else
    if [ -f "${lock}" ]; then
      echo "WARN: Task ${id} has lock but status is '${status}'."
    fi
  fi
done < <(
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
  ' "${TASKS_FILE}"
)

if [ "${errors}" -gt 0 ]; then
  echo "Validation failed: ${errors} error(s)."
  exit 1
fi

echo "Validation passed."
