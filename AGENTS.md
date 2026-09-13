# Agent Instructions — Yuan's Planner Rewrite

## Visual Design Preservation

The rewrite is an architectural migration, NOT a redesign.

- Preserve the existing Planner UI as closely as possible.
- Do not change colors, fonts, spacing, sizing, borders, shadows, icons, layout, wording, responsive behavior, or interaction patterns unless explicitly requested.
- The legacy frontend is the visual reference.
- When migrating a screen/component, compare the new React version against the existing version at the same viewport size.
- Reuse/adapt the existing CSS and design values where practical instead of inventing new styling.
- Do not "modernize", simplify, or improve the design on your own.
- Structural/code improvements are encouraged; visible design changes are not.
- Add visual/browser regression checks for migrated screens at representative desktop and mobile sizes.


## Readability and Structure

The rewritten code must be easy for me to read, understand, and learn from.

- Split code into small, clear modules with one main responsibility.
- Do not replace the current giant files with new giant React/TypeScript/Python files.
- Keep functions short and focused; split complicated functions into meaningful smaller functions.
- Keep React components reasonably small and focused.
- Separate UI, business logic, API calls, database logic, validation, and utilities when they are different responsibilities.
- If a file becomes difficult to understand or navigate, split it by responsibility.
- Do not over-split code just to meet an arbitrary line count. Clarity is the goal.
- Use clear, descriptive names for files, functions, variables, components, and types.
- Add short comments explaining non-obvious logic, business rules, edge cases, or why something is done.
- Do not write long comments or comments that simply repeat obvious code.


## Code Quality Rules

- Use `const` by default; use `let` only when reassignment is necessary; never use `var`.
- Use TypeScript strict mode and avoid `any` unless there is a clear reason.
- Prefer clear names, small focused functions, and files with one clear responsibility.
- Avoid duplicated logic, magic values, and unnecessary abstractions.
- Add short comments only for non-obvious logic, business rules, or edge cases.
- Run linting, type checking, and relevant tests before committing new React/TypeScript work.


## Testing Standard

Tests must be thorough enough to protect behavior during the rewrite. Smoke tests alone are not sufficient.

For each important feature, test where applicable:
- normal/happy-path behavior
- empty, missing, invalid, malformed, and boundary inputs
- reload/restart and persistence behavior
- legacy/existing stored data and compatibility
- cross-feature side effects and synchronization
- date/time and other important edge cases
- important UI interactions with end-to-end tests

Before changing existing behavior, add regression tests that would fail if that behavior broke.

Prefer meaningful behavior assertions over shallow tests that only check that a page/function runs. Do not mock away the real integration being protected when an integration test is appropriate.


---


Before doing any work in this repository:

1. Read `AGENT_HANDOFF.md` completely.
2. Run `git status`.
3. Read the recent Git history.
4. Inspect the current diff, if any.
5. Identify the current task from `AGENT_HANDOFF.md`.

Do not start implementation before completing these steps.

## Working Rules

- Work only on the rewrite/migration branch, not `main`.
- Make small, incremental changes.
- Preserve existing behavior unless a change is explicitly documented.
- Add or update tests before replacing important behavior.
- Run relevant tests after every meaningful change.
- Make frequent, small Git commits after verified working steps.
- Do not intentionally commit broken code.
- Prefer simple, readable code over clever abstractions.
- Keep files focused on one clear responsibility.
- Keep functions reasonably short and focused.
- Add short comments for non-obvious logic, business rules, edge cases, or important decisions.
- Do not add comments that merely repeat what the code obviously says.

## Before Ending Any Session

1. Run relevant tests.
2. Review `git diff` and `git status`.
3. Commit completed working changes.
4. Update `AGENT_HANDOFF.md` with:
   - what was completed
   - current task/state
   - next task
   - unresolved problems
   - important decisions
   - session log

The repository, Git history, tests, `AGENTS.md`, and `AGENT_HANDOFF.md` are the source of truth. Do not rely on previous chat history.
