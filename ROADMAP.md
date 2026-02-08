# TheMusketeer Roadmap

This document outlines the development phases for **TheMusketeer** (formerly ThePuppeteer), a Vibe Kanban framework for agentic workflows.

## Phase 1: Foundation (Completed)

- [x] **Project Structure**: Best practices (Linting, TypeScript, CI/CD).
- [x] **Framework**: Vibe Kanban adoption.
- [x] **Full-Stack Setup**: Backend (Express) + Frontend (React).
- [x] **Deployment**: Docker & CLI.

## Phase 2: Core Features (Completed)

- [x] **Domain Logic**: Agents, Tasks, Kanban Board (In-Memory).
- [x] **API Integration**: Real CRUD endpoints.
- [x] **CLI**: Interactive commands.

## Phase 3: Persistent Memory (Completed)

- [x] **OpenClaW Architecture**: Markdown-based memory (`MEMORY.md`, Daily Logs).
- [x] **Integration**: Connect Agents to MemoryStore via API.
- [x] **CLI**: Memory commands (`log`, `learn`, `show`).

## Phase 4: Advanced Task Manager (Completed)

- [x] **Priorities**: High/Medium/Low task priority.
- [x] **Dependencies**: Task blocking support.
- [x] **Sub-tasks**: Hierarchical task support.

- [ ] **Agent Integration**: Connect with "Trinity" (GitHub, TestSprite, Deployment).
- [ ] **LLM Integration**: Connect agents to LLMs for autonomous execution.

## Phase 9: The Musketeer Expansion (Completed)

- [x] **Generalize Tech Stack**: Support for any language.
- [x] **Multi-Model Agents**: Native Gemini & Anthropic (via official SDKs).
- [x] **Gemini CLI Integration**: Official `@google/gemini-cli` support.
- [x] **Real Google Login**: Native OAuth 2.0 flow.
- [x] **MCP Support**: Universal Tooling via Model Context Protocol.

### Phase 12: Interactive Control & Transparency [ACTIVE]

- [x] **Interactive Neural Link**: Two-way console communication. 🤺
- [x] **ask_user Tool**: Agents can pause and request clarification. 0/10 🤺
- [x] **Sandbox Explorer**: Built-in file browser for agent workspaces. 🤺
- [x] **Split-Screen Interface**: Modern layout with logs and explorer side-by-side. 0/10 🤺
- [ ] **Collaborative Refactor**: Multi-agent coding on same mission.

## Phase 10: Swarm Intelligence & Isolated Environments (Planned)

- [ ] **Agent Delegation**: Agents can spawn/delegate sub-tasks to other agents.
- [ ] **Hierarchical Reporting**: Multi-agent progress tracking and roll-up reports.
- [ ] **Isolated Execution**: Agents work in dedicated Git clones and temporary environments.
- [ ] **Infrastructure Control**: Native support for agents to spin up Docker/Dev Containers for testing.
