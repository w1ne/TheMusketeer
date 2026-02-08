---
description: How to execute a task using the Vibe Kanban framework
---

# Vibe Kanban Task Execution

Follow these steps to complete a task using the Vibe Kanban framework.

1.  **Checkout Branch**
    Create a new branch for your task.

    ```bash
    git checkout -b agent/<task-id>-<description>
    ```

2.  **Red Phase (Test First)**
    Create a failing test case using TestSprite or Playwright.
    // turbo

    ```bash
    # Example: python3 -m testsprite.mcp create_test --scenario "..."
    ```

3.  **Green Phase (Implementation)**
    Write code to pass the test.
    // turbo

    ```bash
    # Run tests to verify
    npm test
    ```

4.  **Refactor & Verify**
    Optimize code and unsure tests still pass.

5.  **Submit PR**
    Push your changes and open a Pull Request.
    // turbo

    ```bash
    git push origin agent/<task-id>-<description>
    ```

6.  **Update Context**
    If you changed architecture, update `.agent/CODEBASE_MAP.md`.
