# Project Structure

This repository has two layers:

1. **The O11 skill + build tooling** (committed, do not remove) — teaches the agent how to author the OutSystems 11 module through the Service Studio MCP server.
2. **The Employee Catalog spec + REST test suite** — the BRD, use-case tracker, steering, and the TypeScript/Vitest tests that validate the deployed O11 REST API.

```
outsystems11-employee-catalog/
├── servicestudio-mcp-oml/      # O11 Model API skill — SKILL.md + reference/ + examples/
├── AGENTS.md                   # Agent contract for driving a live O11 module via MCP
├── .kiro/
│   ├── settings/mcp.json       # MCP server configuration
│   └── steering/               # Project steering (this folder)
├── brd-employee-catalog.md     # Business Requirements Document (O11)
├── 00-use-case.md              # SFTDD use-case tracker (GWT scenarios, phase status)
├── src/
│   └── client.ts               # OutSystemsClient — reusable fetch wrapper
├── tests/
│   ├── setup.ts                # Loads .env via dotenv before each suite
│   ├── client.test.ts          # Offline unit tests for OutSystemsClient
│   ├── create-employee.test.ts # POST /employees integration tests
│   └── employees.test.ts       # GET /employees integration tests
├── .env.example                # Environment variable template (commit this)
├── .env                        # Local secrets (gitignored, never commit)
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

## The O11 module (built in Service Studio, not in this tree)

The actual Employee Catalog entities, server actions, REST API, and screens live **inside the `.oml` module open in Service Studio**, authored through `applyModelApiCode`. There is no local source representation of them — this repository holds the spec that drives the build and the tests that verify the result.

## Conventions

### `src/`
Reusable, non-test code. Currently only `client.ts`.
- `OutSystemsClient` — thin class wrapping native `fetch`. Handles base URL normalisation, default headers (`Content-Type`, `Accept`, optional `X-API-Key`), query-param building, and JSON/text response parsing.
- `getClient()` — lazy singleton factory pre-configured from environment variables.
- All methods return `Promise<ApiResponse<T>>` with `{ status, ok, data, headers }`.

### `tests/`
One file per feature/endpoint group:
1. Define TypeScript interfaces for the response shape.
2. Use the `makeClient()` pattern — real client when `OUTSYSTEMS_BASE_URL` is set, mocked fetch otherwise.
3. Group with `describe` / `it` blocks mirroring the HTTP method and path (e.g. `describe("GET /employees")`).
4. Import from `../src/client.js` (`.js` extension required by NodeNext resolution).

### Import Paths
Always use `.js` extensions for local imports due to `NodeNext` module resolution:
```ts
import { OutSystemsClient } from "../src/client.js";
```

### Mocking
Use `vi.stubGlobal("fetch", vi.fn())` to mock HTTP calls in offline tests. Always call `vi.unstubAllGlobals()` in `afterEach` to avoid leaking mocks between tests.
