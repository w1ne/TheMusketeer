# Codebase Map

This file provides a high-level overview of the `thepuppeteer` repository structure and key architectural constraints. Agents should consult this file before making changes.

## Directory Structure

- `.agent/`: Agent-specific configuration and documentation (e.g., this map).
- `docs/`: Project documentation.
- `README.md`: Main entry point and workflow guide.

## Tech Constraints

- **Vibe Kanban Workflow**: Follow the "Vibe Kanban" process for all changes.
  - Create a new branch for each task: `agent/<task-id>-<description>`.
  - Write a failing test first (Test-Driven Development).
  - Implement changes to pass the test.
  - Open a Pull Request for review.
- **No Direct Prompts**: Avoid leaving TODOs or comments for manual intervention unless absolutely necessary.
- **Minimal Dependencies**: Keep the repository lightweight. Avoid adding unnecessary packages.
- **Tech Stack**: Polyglot (Node.js, Python, Go, Rust supported). Agents should check installed tools (e.g. `python --version`) before using them.

## Key Files

- `README.md`: definitive guide for setup and usage.
- `.agent/CODEBASE_MAP.md`: this file.
