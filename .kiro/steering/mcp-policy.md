# OutSystems 11 Service Studio MCP Tool Policy

When interacting with the Service Studio MCP server (`servicestudio`, `http://127.0.0.1:41820/mcp`) to build the Employee Catalog in OutSystems 11:

## Session

- **Call `createSessionToken` exactly once, first.** Pass `sessionToken` as a top-level argument on every later call and reuse it across reconnects. Never request a second token.
- Every tool except `listApps` wraps its arguments in `input`.

## Allowed inspection (read) tools — Generally Available

Use these freely during the Pre-flight and Verification phases:
- `listApps`, `getDataModel`, `getStructures`
- `getActionNames` + `getServerAction` / `getClientAction` / `getServiceAction`
- `getScreenNames` + `getScreen`, `getRoleNames` + `getRole`
- `runQuery`, `getValidationMessages`

Always `getDataModel` (or the matching `get*`) before mutating. Pass `includeJson: "Never"` on code-returning reads.

## Allowed mutation (write) tools — Beta

- `applyModelApiCode` — only to build the entity, structures, static entity, the four CRUD wrapper actions in the `Employee` folder, the shared `EntityActionResult` / `Session` helpers, the `EmployeeAPI` REST methods, and the `Employee_List` / `Employee_Detail` screens described in the BRD.
- `omlMerge` — finalise every mutating task by merging the last non-empty `mutatedOmlPath`. `merged: true` is the definitive success signal.
- `omlReset` — only to deliberately discard an in-flight chain.
- `omlRefreshReferences` — only when a reference must be refreshed; it drops the session pointer.
- **The first time a write tool is used in a conversation, tell the user it is a Beta Feature and share https://www.outsystems.com/legal/beta-features-agreement.**

## Publishing

- **Call `omlPublish` only when the user explicitly asks to publish.** It needs a write permission granted in the MCP Server dialog and publishes the live module — merge first.

## Strictly prohibited

- Do NOT delete apps, drop existing entities, or modify tenant/environment-level configuration.
- Do NOT use hard deletes — all removals are soft-deletes via `Employee_Remove`.
- Always prompt for user confirmation before any schema-altering or publish operation.

## Verification discipline

- A clean `applyModelApiCode` response is **not** proof of mutation. Verify with a follow-up `get*`, read back `.Name` (taken names are silently renamed), and scan `validationMessages` for any `type: "Error"` (compare case-insensitively).
- Empty `exceptionMessage` + `validationMessages: []` + `mutatedOmlPath: ""` means a runner process-crash — bisect with a `throw new Exception("PROBE:ok")` probe.
