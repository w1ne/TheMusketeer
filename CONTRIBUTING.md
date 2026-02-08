# Contributing to thepuppeteer

Thank you for your interest in contributing! We follow the **Vibe Kanban** framework and standard Gitflow practices.

## Gitflow Workflow

We use a standard Gitflow branching model:

- **`main`**: Production-ready code. Do not push directly to `main`.
- **`develop`**: Integration branch for new features. All features merge here first.
- **`feature/<name>`**: Feature branches. Branch off `develop`, merge back to `develop`.
- **`release/<version>`**: Release preparation. Branch off `develop`, merge to `main` and `develop`.
- **`hotfix/<name>`**: Critical fixes associated with a production release. Branch off `main`, merge to `main` and `develop`.

### Making Changes

1.  **Claim a Task**: Pick a task from the Kanban board or create a new issue.
2.  **Create a Branch**:
    ```bash
    git checkout -b feature/my-amazing-feature develop
    ```
3.  **Test First**: Write a failing test case before implementing code (TDD).
4.  **Commit**: Use descriptive commit messages.
    - We use `husky` to run linting and type checking on commit.
5.  **Push & PR**: Push to origin and open a Pull Request against `develop`.

## Release Strategy

We use [Semantic Versioning](https://semver.org/) (Major.Minor.Patch).

1.  **Prepare Release**: Create a `release/vX.Y.Z` branch from `develop`.
2.  **Update Changelog**: Move items from "Unreleased" to "vX.Y.Z" in `CHANGELOG.md`.
3.  **Bump Version**: Update `version` in `package.json`.
4.  **Merge**: Merge `release/vX.Y.Z` into `main` and tag it:
    ```bash
    git checkout main
    git merge release/vX.Y.Z
    git tag -a vX.Y.Z -m "Release vX.Y.Z"
    git push origin main --tags
    ```
5.  **Back-merge**: Merge `release/vX.Y.Z` back into `develop`.

## Coding Standards

- **TypeScript**: Strict mode enabled.
- **Linting**: ESLint + Prettier. Run `npm run lint` locally.
- **Testing**: Jest. Run `npm test` locally.
