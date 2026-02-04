#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: $0 [--target <repo-root>]

Generates docs/AGENT_REPORTS.md index from docs/agent_reports/*.md.
USAGE
}

TARGET=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --target)
      TARGET="$2"
      shift 2
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

REPORTS_DIR="${TARGET}/docs/agent_reports"
INDEX_FILE="${TARGET}/docs/AGENT_REPORTS.md"

mkdir -p "${REPORTS_DIR}"

{
  echo "# Agent Reports (Generated)"
  echo ""
  echo "Do not edit manually. Reports live in \`docs/agent_reports/\`."
  echo ""
  if compgen -G "${REPORTS_DIR}/*.md" > /dev/null; then
    for file in $(ls -1 "${REPORTS_DIR}"/*.md | sort); do
      base=$(basename "$file")
      echo "- \`${base}\`"
    done
  fi
} > "${INDEX_FILE}"
