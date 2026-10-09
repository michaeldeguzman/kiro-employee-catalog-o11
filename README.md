# Employee Catalog on OutSystems 11 — built with Kiro + the Service Studio MCP

An end-to-end demonstration of building a real **OutSystems 11** backend — entities,
business logic, and an exposed REST API — by driving **Service Studio's in-process MCP
server** from the [Kiro](https://kiro.dev) agent, guided by a spec-first workflow.

The module was authored entirely through the Model API (`applyModelApiCode`), reviewed
through Service Studio's Compare-and-Merge, published, and then **verified live** by a
TypeScript/Vitest REST suite running against the deployed endpoint.

> This repository accompanies an article on agent-driven OutSystems 11 development.
> It is shared as evidence of the process and the resulting artifacts.

---

## What was built

A backend-only **Employee Catalog** HR application (OutSystems 11 Service module,
`EmployeeCatalog_CS`):

| Layer | Contents |
| --- | --- |
| **Data model** | `Employee` entity (business + audit fields, unique email index), `MessageType` static entity, `EntityActionMessage` / `EntityActionResult` structures |
| **Shared logic** | `EntityActionResult_BuildFromSuccess` / `_BuildFromError` / `_CombineEntityActionMessages`, `Session_GetNormalizedSessionUserId` |
| **CRUD wrappers** | `Employee_Validate`, `Employee_Upsert`, `Employee_GetCanRemove`, `Employee_Remove` (soft-delete) — the "DB Results" pattern |
| **REST API** | `EmployeeAPI` — `POST /employees`, `GET /employees`, `GET /employees/{Id}` with real HTTP status codes (201 / 400 / 404 / 409 / 500) |

**Status:** built, published, and live-verified — the REST suite passes **20/20** against
the deployed API.

**Scoped out by design:** UI screens (`Employee_List`, `Employee_Detail`) and roles — a
Service module has no UI, so those belong to a follow-on Reactive module. No `PUT`/`DELETE`
endpoints were exposed.

---

## How it was built

The build was driven conversationally through Kiro, which called the Service Studio MCP
tools to read and mutate the live module:

1. **Spec-first.** A Business Requirements Document (`brd-employee-catalog.md`) and an
   SFTDD use-case tracker (`00-use-case.md`) defined the data model, validation rules,
   CRUD pattern, and REST contract before any code.
2. **Read, mutate, verify, merge.** Each increment read the live model first
   (`getDataModel` / `get*`), mutated it with `applyModelApiCode`, verified with a
   follow-up read plus a `validationMessages` scan, then finalised with `omlMerge`.
3. **Checkpoint merges.** The data model, shared helpers, CRUD wrappers, and REST API
   were each merged as reviewable increments.
4. **Publish + live test.** The module was published (`omlPublish`), then the Vitest
   suite ran against the live endpoint — which surfaced and fixed real issues (REST URL
   path shaping and a list-mapping bug) that model-level validation alone did not catch.

A full chronological build log — including every trap hit and how it was resolved — is in
[`run-log.md`](run-log.md).

---

## Repository layout

```
.
├── brd-employee-catalog.md     # Business Requirements Document (OutSystems 11)
├── 00-use-case.md              # SFTDD use-case tracker (GWT scenarios, phase status)
├── run-log.md                  # Chronological build log (actions, decisions, outcomes)
├── .kiro/steering/             # Project steering (product, tech, structure, CRUD pattern, MCP policy, …)
├── servicestudio-mcp-oml/      # The OutSystems 11 Model API skill that teaches the agent
├── AGENTS.md                   # Agent contract for driving a live O11 module via MCP
├── src/client.ts               # Reusable REST client (fetch wrapper)
├── tests/                      # Vitest REST integration + offline unit tests
├── package.json / tsconfig.json / vitest.config.ts
└── .env.example                # Environment template for the test suite
```

---

## Running the REST tests

The test suite verifies the deployed `EmployeeAPI`. It also runs offline (mocked `fetch`)
so it passes in CI without a live backend.

```bash
# 1. Install dependencies
npm install

# 2. (Optional) point the suite at a live endpoint
cp .env.example .env
# then set OUTSYSTEMS_BASE_URL=https://<your-env-host>/EmployeeCatalog_CS/rest/EmployeeAPI

# 3. Run
npm test            # all tests once
npm run typecheck   # type-check only
```

When `OUTSYSTEMS_BASE_URL` is unset, the integration tests fall back to an in-process
mock, so the suite stays green without a live environment.

---

## The OutSystems 11 MCP skill

The `servicestudio-mcp-oml/` directory contains the OutSystems 11 Model API **skill** that
teaches the agent how to read and mutate an O11 module through Service Studio's embedded
MCP server. It is distributed by OutSystems (see [`LICENSE`](LICENSE)) and is included here
so the build is reproducible. `SKILL.md` is the authoritative contract; the `reference/`,
`examples/`, and `docs/` folders are supporting material.

> The MCP write capabilities used here (`applyModelApiCode`, `omlMerge`, `omlPublish`, …)
> are an OutSystems Beta Feature.

---

## Notes

- The live environment host is **not** committed — it lives only in a local, gitignored
  `.env`. The build log and tracker reference the environment generically.
- One documented deviation from the BRD: `Employee_Remove` returns a failure result
  rather than raising `ProcessingException` (the Model API does not raise System
  exceptions). Behaviourally equivalent for callers that inspect the result.
