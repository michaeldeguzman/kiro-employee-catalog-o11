# Tech Stack

## Target platform

- **OutSystems 11 (O11)** — the Employee Catalog module is authored in **Service Studio** and mutated through the **Service Studio MCP server** (`servicestudio`, `http://127.0.0.1:41820/mcp`).
- Model API writes go through `applyModelApiCode`; changes are finalised with `omlMerge`. See `servicestudio-mcp-oml/SKILL.md` for the full contract.

## REST test suite

The REST test suite is a standalone TypeScript project that calls the deployed O11 REST API. It does not depend on O11 at build time.

### Language & Runtime
- **TypeScript 5.6+** targeting ES2022, compiled with `NodeNext` module resolution.
- **Node.js** (ESM — `"type": "module"` in package.json).

### Test Framework
- **Vitest 5.x** — test runner, assertions, and mocking.
  - `globals: true` — `describe`, `it`, `expect`, `vi` available without imports (explicit imports still preferred).
  - `environment: node` — no DOM.
  - `testTimeout: 15000ms` — accounts for slow REST calls.
  - Setup file: `tests/setup.ts` loads `.env` before each suite via `dotenv`.

### Key Libraries

| Package | Purpose |
|---|---|
| `vitest` | Test runner + assertions |
| `@vitest/coverage-v8` | Code coverage via V8 |
| `@vitest/ui` | Browser-based test UI |
| `dotenv` | Load `.env` into `process.env` |
| `typescript` | Compiler / type-checking |

### Environment Configuration

Copy `.env.example` to `.env` and set:

```
OUTSYSTEMS_BASE_URL=https://<your-env>.outsystems.app/EmployeeCatalog/rest/EmployeeAPI
OUTSYSTEMS_API_KEY=         # optional, sent as X-API-Key header
```

The O11 REST base URL follows the pattern `https://<environment-host>/<ModuleName>/rest/<APIName>`. For an on-premises O11 environment it is typically `https://<server>/<ModuleName>/rest/<APIName>`.

When `OUTSYSTEMS_BASE_URL` is unset, integration tests fall back to a mocked fetch so the suite passes in CI without a live backend.

### Common Commands

```bash
npm test                 # Run all tests once (CI-safe)
npm run test:watch       # Re-run on file changes
npm run test:ui          # Open Vitest browser UI
npm run test:coverage    # Run tests + generate coverage report
npm run typecheck        # Type-check without running tests
```

### TypeScript Config Highlights
- `strict: true`
- `module: NodeNext` / `moduleResolution: NodeNext` — imports **must** use `.js` extensions even for `.ts` source files
- `target: ES2022`
- `types: ["node", "vitest/globals"]`
