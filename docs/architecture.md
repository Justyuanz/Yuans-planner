# Architecture

How Yuan's Planner is put together. This describes the application as it is.

## Shape

A Python process serves a compiled React application and owns a SQLite file.
There is no framework on the backend and no state container on the frontend:
the server is a key/value store with a few endpoints, and the browser holds one
store object that every page reads.

```text
browser                          python                      disk
  React app  ──── /api/kv ────▶  http_server.py  ──────▶  planner.db
  (one store                     planner_api.py            (kv_store table)
   object)   ◀─── JSON ───────   db.py
                                 openai_mascot.py ─────▶ OpenAI (optional)
```

## Backend

Python standard library only. No dependencies to install.

| Module | Lines | Responsibility |
| --- | --- | --- |
| `app.py` | 56 | Process bootstrap: bind the socket and serve. |
| `http_server.py` | 200 | HTTP transport, routing, and static delivery of `frontend/dist`. |
| `planner_api.py` | 59 | The application boundary: validates keys and shapes request payloads. |
| `db.py` | 94 | SQLite access. |
| `config.py` | 70 | Environment and `.env` settings. |
| `openai_mascot.py` | 325 | Optional OpenAI-backed mascot replies. |

Endpoints: `/api/kv`, `/api/export`, `/api/import`, `/api/mascot/chat`,
`/api/mascot/status`. Anything else falls through to the React shell, so client
routing works on a refresh.

## Storage contract

Every value is a JSON string under a key beginning `hivePlanner.`. The server
rejects any other key. These names are a compatibility contract: stored data
predates the rewrite, so renaming a key orphans real data. Examples:
`hivePlanner.dailyTasks.<date>`, `hivePlanner.events`,
`hivePlanner.journal.entries`, `hivePlanner.money.transactions`,
`hivePlanner.routine.week.<ISO week>`.

The backend treats stored values as opaque strings. Record shapes belong to the
React application; Python only validates the key prefix and string value.

## Frontend

React with TypeScript in strict mode, built by Vite.

React Router maps `/`, `/journal`, `/money`, `/calendar`, `/skate` and
`/guitar` to their page components. The optional `?date=` query selects the
planner date. Navigation is client-side, and the backend serves the React shell
for non-API paths so direct links and refreshes resolve correctly. Page modules
are lazy-loaded at the route boundary to keep them out of the initial bundle.

| Area | Files | Lines | Responsibility |
| --- | --- | --- | --- |
| `pages/` | 128 | 15,275 | One directory per view, each with its cards beneath. |
| `shared/` | 32 | 3,658 | Anything used by more than one page. |
| `styles/` | 16 | 4,600 | The stylesheet, split by surface. |
| `mascot/` | 14 | 1,873 | Sprouty. |
| `app/` | 11 | 527 | Shell, routing, store, persistence. |
| `api/` | 2 | 281 | The HTTP client. |

Pages are `calendar`, `dashboard`, `guitar`, `journal`, `money` and `skate`.
Each holds `<Name>Page.tsx` and a `cards/` directory with one directory per
card, so a card's model, its component and its tests sit together.

Imports reach outside their own directory through `@/`, which means `src/`; a
lint rule rejects deeper relative paths. Files inside one card import each
other relatively.

### Rules the structure follows

- **A page never imports another page.** One exception: the Dashboard renders
  the Money quick-log card, because that card genuinely appears on both.
- **`shared/` never imports a page.** If two pages need the same thing, it
  moves to `shared/` rather than one page reaching into the other.
- **The mascot may read any page.** It answers questions about every surface,
  so this is its job rather than a leak.
- **Stylesheet order is fixed.** `planner.css` imports the parts in a cascade
  order that is part of the design; `responsive.css` and then `overrides.css`
  stay last. Seventeen selectors are styled in two parts each and five of them
  conflict, so moving a part changes what renders. The header of `planner.css`
  has the details.

### Data flow

`app/use-planner-store.ts` loads every key once into a single store object.
Pages read from it and never fetch on their own. Writes go through
`app/planner-persistence.ts`, which holds **one queue**: whole-document
snapshots written concurrently used to overwrite each other, which lost data,
so every write is serialized.

## The agent layer

Sprouty is deterministic first. The facts come from the planner, never from the
model's memory.

With `OPENAI_API_KEY` set, the browser posts the question plus a compacted
metrics bundle to `/api/mascot/chat`, and the server calls OpenAI under a system
prompt that restricts it to the evidence supplied. Without a key, `ask_mascot`
refuses and the frontend falls back to `mascot-local-reply.ts`, which answers
from the same stored data by rule. The same fallback covers an unreachable or
slow server, so the planner never depends on the network to answer.

- `shared/activity-log.ts` — the event history insights are derived from.
- `pages/dashboard/cards/insight/dashboard-insight-rules.ts` — the rules that
  turn metrics into one insight, each carrying its evidence.
- `mascot/mascot-context.ts` — gathers grounded context from every surface.
- `mascot/mascot-local-retrieval.ts` and `mascot-local-reply.ts` — answer from
  stored data when the server is unavailable.
- `mascot/mascot-action-suggestions.ts` — turns an answer into offered actions.

The dashboard shows at most one insight at a time, on purpose.

## Testing

Four layers, all run by `scripts/test.sh` and by CI:

| Layer | What it covers |
| --- | --- |
| Python `unittest` | The server, storage, configuration, and mascot integration. |
| Vitest | Models, decoders and rules, against malformed and boundary input. |
| ESLint and `tsc --noEmit` | Strict types, no `any`, no deep relative imports. |
| Node `--test` with Chrome | The production bundle in a real browser. |

The browser tests assert **pinned contracts** in `tests/helpers/*-contract.js`:
text, computed styles, geometry and tolerant image signatures captured from the
original application. They are how a visual change gets caught, and changing a
pinned value is a design decision, not a test fix.

A skipped test counts as a failure here. CI fails the run if the browser suite
reports any skip, because a skip means a missing prerequisite rather than a
passing check.
