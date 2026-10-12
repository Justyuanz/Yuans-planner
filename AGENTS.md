# Agent Instructions — Yuan's Planner Rewrite

## Visual Design Preservation

The rewrite is an architectural migration, NOT a redesign.

- Preserve the existing Planner UI as closely as possible.
- Do not change colors, fonts, spacing, sizing, borders, shadows, icons, layout, wording, responsive behavior, or interaction patterns unless explicitly requested.
- The visual reference is `main` plus the pinned contracts. `main` still holds the complete runnable legacy app (checked out at `/Users/yuan/Desktop/Hive/YuanPlanner`), so it can be run and compared against whenever a question comes up. The pinned contracts in `tests/helpers/*-contract.js` hold its verified text, computed styles, geometry, and rendered-image signatures.
- When changing a screen/component, compare it against the pinned contract at the same viewport size. Changing a pinned value is a visible design change and needs explicit approval.
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


## Refactor Phase

Order of work: finish the migration, get every test green, fix known bugs — **then** start the architecture refactor. Do not begin refactoring while migration or bug work is still outstanding.

The refactor is structural only:

- No behavior change, no visual change, no API change, no storage or compatibility change.
- Prefer move-only steps: move files, update imports, rename for consistency. Do not rewrite logic while moving it.
- Never combine a move with a behavior change in one step. If a move reveals a bug, stop, write it down, and fix it separately with its own regression test.
- Do not change CSS class names, DOM ids, or `hivePlanner.*` storage keys. The browser contracts and the compatibility of existing stored data depend on them.
- Keep every stage revertable on its own.

Be careful here, and verify more than usual:

- Capture a baseline before starting: the complete suite green, and the hash of the built stylesheet.
- Work in small stages. After **each** stage run the complete suite — Python tests, React/TypeScript tests, lint, strict type checking, the production build, and all browser tests. A subset is not enough.
- Whenever stylesheets are untouched, the built stylesheet must stay byte-identical. A changed hash means something moved that should not have.
- When a step deliberately changes the stylesheet, such as deleting dead rules, the gate is instead the pinned computed-style and geometry contracts, the rendered-image signatures, and the live page pass. Diff the built stylesheet and confirm every removed declaration belongs to a selector that was deliberately deleted.
- Treat a skipped test as a failure to investigate, not a pass.
- Re-run the live browser pass over all six pages at desktop and phone size, watching for console and network errors.
- If a test turns flaky, find the cause before continuing. Never re-run a test until it happens to pass.
- If a refactor step cannot be verified this thoroughly, do not take that step.


---


Before doing any work in this repository:

1. Read `AGENT_HANDOFF.md` completely.
2. Run `git status`.
3. Read the recent Git history.
4. Inspect the current diff, if any.
5. Identify the current task from `AGENT_HANDOFF.md`.

Do not start implementation before completing these steps.

## Plans Are Guides, Not Contracts

A plan in `AGENT_HANDOFF.md` sets the intended order of work. It is not a script
to follow past the point of sense. When something unplanned turns up during a
session:

- **Fix it** when it is small, when it sits in the code being touched anyway, or
  when leaving it would be a real risk such as data loss or a wrong recorded
  decision. Anything fixed gets the same verification as planned work: a
  regression test that would have caught it, and the complete suite.
- **Record it** when it is larger or unrelated. Add it to Known Problems or amend
  the plan, with enough evidence that the next session does not rediscover it. A
  discovery that exists only in a chat reply is lost.
- **Extend the session** when finishing something matters more than stopping at
  the planned boundary, and equally drop a planned item when a discovery makes it
  wrong. Record whichever choice you make.
- **Correct the plan** when a measurement contradicts it. Plans are written from
  measurements, so a newer measurement wins.
- Never let extra work weaken verification. If something cannot be verified
  properly in the time remaining, record it rather than rushing it in.

Investigate surprises rather than working around them. A flaky test, a figure
that does not match the code, or a contract that fails unexpectedly is evidence
of something real until proven otherwise.

## Working Rules

- Work only on the rewrite/migration branch, not `main`.
- Make small, incremental changes.
- Preserve existing behavior unless a change is explicitly documented.
- Add or update tests before replacing important behavior.
- Run relevant tests after every meaningful change.
- Make exactly one Git commit per session. Work in small verified steps, then squash them into that single commit, with a message that keeps the steps legible.
- Do not intentionally commit broken code.
- Prefer simple, readable code over clever abstractions.
- Keep files focused on one clear responsibility.
- Keep functions reasonably short and focused.
- Add short comments for non-obvious logic, business rules, edge cases, or important decisions.
- Do not add comments that merely repeat what the code obviously says.

## Before Ending Any Session

1. Run relevant tests.
2. Review `git diff` and `git status`.
3. Commit the session's completed work as a single commit.
4. Update `AGENT_HANDOFF.md` with:
   - what was completed
   - current task/state
   - next task
   - anything found but not fixed, and any planned item dropped or deferred, with its evidence
   - unresolved problems
   - important decisions
   - session log

The repository, Git history, tests, `AGENTS.md`, and `AGENT_HANDOFF.md` are the source of truth. Do not rely on previous chat history.
