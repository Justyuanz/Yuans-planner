# Agent Instructions — Yuan's Planner Rewrite

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
