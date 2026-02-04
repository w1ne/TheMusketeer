#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: $0 [--target <repo-root>] [--force]

Bootstraps task workflow files into the target repo:
- docs/AGENT_TASKS.md
- docs/AGENT_REPORTS.md (generated index)
- docs/claims/README.md
- docs/claims/.gitignore
- docs/agent_reports/

If --target is not provided, the current git repo root is used.
USAGE
}

TARGET=""
FORCE=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --target)
      TARGET="$2"
      shift 2
      ;;
    --force)
      FORCE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1"
      usage
      exit 2
      ;;
  esac
 done

if [ -z "${TARGET}" ]; then
  if git rev-parse --show-toplevel >/dev/null 2>&1; then
    TARGET="$(git rev-parse --show-toplevel)"
  else
    echo "No target specified and not inside a git repo. Use --target <repo-root>."
    exit 2
  fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUPPETEER_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

TASKS_SRC="${PUPPETEER_ROOT}/docs/AGENT_TASKS.md"
REPORTS_SRC="${PUPPETEER_ROOT}/docs/AGENT_REPORTS.md"
CLAIMS_README_SRC="${PUPPETEER_ROOT}/docs/claims/README.md"

TASKS_DST="${TARGET}/docs/AGENT_TASKS.md"
REPORTS_DST="${TARGET}/docs/AGENT_REPORTS.md"
CLAIMS_DIR="${TARGET}/docs/claims"
CLAIMS_README_DST="${CLAIMS_DIR}/README.md"
CLAIMS_GITIGNORE_DST="${CLAIMS_DIR}/.gitignore"
REPORTS_DIR="${TARGET}/docs/agent_reports"

mkdir -p "${TARGET}/docs" "${CLAIMS_DIR}" "${REPORTS_DIR}"

copy_file() {
  local src="$1"
  local dst="$2"
  if [ -f "${dst}" ] && [ "${FORCE}" -ne 1 ]; then
    echo "Skip existing: ${dst}"
    return
  fi
  cp "${src}" "${dst}"
  echo "Wrote: ${dst}"
}

copy_file "${TASKS_SRC}" "${TASKS_DST}"
copy_file "${REPORTS_SRC}" "${REPORTS_DST}"
copy_file "${CLAIMS_README_SRC}" "${CLAIMS_README_DST}"

if [ -f "${CLAIMS_GITIGNORE_DST}" ] && [ "${FORCE}" -ne 1 ]; then
  echo "Skip existing: ${CLAIMS_GITIGNORE_DST}"
else
  printf "task-*.lock/\n" > "${CLAIMS_GITIGNORE_DST}"
  echo "Wrote: ${CLAIMS_GITIGNORE_DST}"
fi

# Generate index in target repo
"${PUPPETEER_ROOT}/tools/generate_reports_index.sh" --target "${TARGET}" >/dev/null

echo "Bootstrap complete."
