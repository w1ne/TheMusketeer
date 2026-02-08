# Google Antigravity Vibe Kanban

A Lean Framework for Accelerated Agentic Delivery.

This repository implements the "Vibe Kanban" methodology for high-velocity AI-driven development. It replaces complex permission hierarchies with parallel agent execution and automated verification.

## Core Philosophy

1.  **Parallel Execution**: Treat agents as a swarm of parallel workers. Spawn multiple agents simultaneously for distinct tasks.
2.  **Test-Driven Development (TDD)**: Agents typically cannot write implementation code until a failing test exists.
3.  **Automated Verification**: Use automated tests (TestSprite/Playwright) to validate changes.
4.  **Lean Context**: Use `.agent/CODEBASE_MAP.md` as the single source of truth for repository structure and constraints.

## Prerequisites

To fully leverage this framework, ensure you have the following MCP servers configured:

1.  **GitHub MCP**: For repository control and branch management.
2.  **TestSprite / Playwright MCP**: For running headless browser tests and validation.

## Workflow

### 1. Task Definition

Break down features into small, atomic units of work. Avoid large, monolithic tasks.

### 2. Parallel Agent Spawning (Vibe Kanban)

Use the Antigravity Manager Surface to spawn separate agents for each task.

### 3. Execution Cycle

For each agent/task:

1.  **Checkout Branch**: Create a new branch `agent/<task-id>`.
2.  **Red Phase**: Create a failing test case that reproduces the bug or defines the feature.
3.  **Green Phase**: Implement the code to pass the test.
4.  **Refactor**: Optimize the code while keeping tests green.
5.  **Pull Request**: Open a PR for review.

### 4. Turbo Mode

Enable **Turbo Mode** for trusted directories to automate terminal commands (e.g., `npm install`, `git commit`) without constant confirmation.

## Directory Structure

- `.agent/CODEBASE_MAP.md`: High-level map of the codebase.
- `docs/`: Documentation.
- `README.md`: This file.

## Installation & Usage

### Method 1: NPX (Recommended for quick use)

Run the tool directly without installation:

```bash
npx thepuppeteer
```

### Method 2: Global Install

Install it globally via npm:

```bash
npm install -g thepuppeteer
thepuppeteer
```

### Method 3: Docker

Run via Docker to avoid environment issues:

```bash
# Build the image
docker build -t thepuppeteer .

# Run the container
docker run -it thepuppeteer
```

## Getting Started

1.  Review `.agent/CODEBASE_MAP.md` to understand the project structure.
2.  Define your tasks.
3.  Start spawning agents!
