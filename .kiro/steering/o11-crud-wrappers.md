# OutSystems 11 CRUD Wrapper — DB Results Pattern

When designing, generating BRDs, or scaffolding **OutSystems 11 (O11)** server actions for an entity, strictly adhere to the DB Results pattern below. The pattern is platform-agnostic OutSystems; the mechanics (Model API via `applyModelApiCode`, O11 REST conventions, O11 deployment behavior) are specific to O11 and Service Studio.

## Core Philosophy
- Every entity gets **4 server actions** placed in an action folder named exactly `{Entity}`:
  1. `{Entity}_Validate`
  2. `{Entity}_Upsert`
  3. `{Entity}_GetCanRemove`
  4. `{Entity}_Remove` (soft-delete)
- Do **not** create standalone `GetAll` or `GetById` server actions. Aggregates fetch data directly in screens or REST methods.
- Do **not** use hard deletes.
- Never call raw entity actions (`Create{Entity}`, `Update{Entity}`, `CreateOrUpdate{Entity}`) directly from UI screens or exposed REST methods.

---

## 1. Entity Standard Audit Fields
Every wrapped entity must include these attributes alongside its business fields:

| Attribute | Type | Mandatory | Default | Notes |
|---|---|---|---|---|
| `Id` | Long Integer | Yes | AutoNumber | Primary key |
| `IsActive` | Boolean | No | `True` | Soft-delete flag (safe default for populated tables) |
| `CreatedByUserId` | User Identifier | No | _(none)_ | Audit (FK to User) |
| `CreatedOn` | DateTime | No | `#1900-01-01 00:00:00#` | Safe default |
| `UpdatedByUserId` | User Identifier | No | _(none)_ | Audit (FK to User) |
| `UpdatedOn` | DateTime | No | `#1900-01-01 00:00:00#` | Safe default |

*Rule:* When **adding** audit attributes to an entity that already has data in a target environment, set `IsMandatory = False` with safe defaults. In O11, publishing a mandatory attribute with no default onto a populated table fails the publish/version upgrade (the "mandatory attribute needs a default value" platform error). Safe defaults avoid it.

---

## 2. Required Shared Infrastructure
Before constructing entity actions, verify or create these helpers (read first with `getStructures` / `getDataModel` / `getActionNames`):

- **Structures:**
  - `EntityActionResult`: `IsSuccess` (Boolean), `EntityActionMessages` (List of EntityActionMessage), `CombinedEntityMessageText` (Text), `CombinedEntityActionMessageTypeId` (MessageType Identifier).
  - `EntityActionMessage`: `MessageTypeId` (MessageType Identifier), `MessageText` (Text).
- **Static Entity:** `MessageType` (Records: Success = 1, Error = 2, Warning = 3, Info = 4).
- **Folder `EntityActionResult`:**
  - `EntityActionResult_BuildFromSuccess(EntityActionResultMessageText: Text)`
  - `EntityActionResult_BuildFromError(EntityActionResultMessageText: Text)`
  - `EntityActionResult_CombineEntityActionMessages(EntityActionMessages: EntityActionMessage List)`
- **Folder `Session`:**
  - `Session_GetNormalizedSessionUserId()` -> `NormalizedSessionUserId: User Identifier` (**set `Function = True`** so it can be invoked inline in Assign nodes). In O11 the current user comes from `GetUserId()` (System action); normalise it for use as an audit UserId.

---

## 3. The 4 CRUD Server Actions

### Action 1: `{Entity}_Validate`
- **Input:** `Source` (`{Entity}` record, Mandatory)
- **Output:** `EntityActionResult`
- **Rules:**
  - Check mandatory fields and max length constraints.
  - If invalid, append to `EntityActionResult.EntityActionMessages` (`MessageTypeId = Entities.MessageType.Error`).
  - If list is empty: assign `IsSuccess = True`.
  - If list is NOT empty: call `EntityActionResult_CombineEntityActionMessages`, assign `IsSuccess = False`, and map combined message text & message type.
  - **Do NOT** call `BuildFromError` or `BuildFromSuccess` inside `_Validate`.

### Action 2: `{Entity}_Upsert`
- **Input:** `Source` (`{Entity}` record, Mandatory)
- **Output:** `EntityActionResult`, `Id` (`{Entity}` Identifier)
- **Rules:**
  - Run `{Entity}_Validate(Source)` first; if not success, exit returning that result.
  - Check `Source.Id = NullIdentifier()`:
    - **Create Path:**
      - `CreatedOn = CurrDateTime()`
      - `CreatedByUserId = Session_GetNormalizedSessionUserId()`
      - `UpdatedOn = Source.CreatedOn` (copy, do NOT invoke `CurrDateTime()` again)
      - `UpdatedByUserId = Source.CreatedByUserId` (copy)
      - `IsActive = True`
      - Call entity action `Create{Entity}(Source)`
      - Assign `Id = Create{Entity}.Id`
    - **Update Path:**
      - `UpdatedOn = CurrDateTime()`
      - `UpdatedByUserId = Session_GetNormalizedSessionUserId()`
      - Call entity action `Update{Entity}(Source)`
      - Assign `Id = Source.Id`
  - Both paths end with `EntityActionResult = EntityActionResult_BuildFromSuccess("{Entity} """ + Source.{NameField} + """ has been saved.")`.
  - **Inline Execution:** `Session_GetNormalizedSessionUserId()` must be called inline in Assign nodes, never as a separate flow block.
  - **Exception Handlers:** Must include `DatabaseException` (return generic admin error via `BuildFromError`) and `AllExceptions` (return `ExceptionMessage` via `BuildFromError`).

### Action 3: `{Entity}_GetCanRemove`
- **Input:** `Id` (`{Entity}` Identifier, Mandatory)
- **Output:** `EntityActionResult`
- **Rules:**
  - Use an **Aggregate** named `GetById` (filter `{Entity}.Id = Id`, `MaxRecords = 1`).
  - If null/missing: return `BuildFromError("Cannot remove an unsaved {Entity}.")`.
  - If `IsActive = False`: return `BuildFromError("Cannot remove {Entity} """ + Name + """, it is already removed.")`.
  - If `IsActive = True`: return `BuildFromSuccess("")`.
  - Add `DatabaseException` handler that **raises** `ProcessingException`.

### Action 4: `{Entity}_Remove`
- **Input:** `Id` (`{Entity}` Identifier, Mandatory)
- **Output:** `EntityActionResult`
- **Rules:**
  - Call `{Entity}_GetCanRemove(Id)`.
  - If `IsSuccess = False`: **RAISE** `ProcessingException(CombinedEntityMessageText)` (do not return failure result).
  - Lock row using entity action `GetForUpdate{Entity}(Id)`.
  - Assign on `GetForUpdate{Entity}.Record.{Entity}`: `UpdatedOn = CurrDateTime()`, `UpdatedByUserId = Session_GetNormalizedSessionUserId()`, and `IsActive = False`.
  - Call entity action `Update{Entity}(GetForUpdate{Entity}.Record)`.
  - Return `EntityActionResult = EntityActionResult_BuildFromSuccess("{Entity} """ + Record.{NameField} + """ has been removed.")`.
  - Include both `DatabaseException` and `AllExceptions` handlers calling `BuildFromError`.

---

## 4. Exposed REST API Conventions (O11)

Expose a REST API under **Logic tab > Integrations > REST > (expose)**. Via the Model API this is `eSpace.CreateIntegration<ServiceStudio.Plugin.RESTService.IRestService>("{Entity}API")` with `CreateAction` per method. A new REST method already has a Start and an End — do not add a second Start (`InvalidFlow_TooManyNodes`).

### Core Rules
- Endpoints must NEVER call built-in entity actions (`Create{Entity}`, `Update{Entity}`, `CreateOrUpdate{Entity}`, `Delete{Entity}`) directly.
- Endpoints must delegate to the corresponding `{Entity}` CRUD wrapper actions or Aggregates.
- Endpoints must unpack `EntityActionResult` and map the HTTP response status code accordingly.
- **Set the HTTP status code explicitly** using the `HTTPRequestHandler` extension's `SetStatusCode(Status)` action. O11 defaults to HTTP 200 on a normal End, so any non-200 (201/400/404/409/500) must call `SetStatusCode` before the End node.
- **Set `Authentication` deliberately** — a newly exposed REST API defaults to `Authentication = None`, which leaves it unauthenticated.

### Standard REST Endpoint Pattern for `{Entity}`

| HTTP Method | Route | Target Logic | Success Code & Body | Error / Validation Handling |
|---|---|---|---|---|
| `POST` | `/{entities}` | `{Entity}_Upsert` | **201 Created**<br>Return `{ Id, ... }` | If `IsSuccess = False`: `SetStatusCode(409)` for duplicate/unique-constraint; `SetStatusCode(400)` for other validation failures. Assign the error body and reach a normal End. |
| `GET` | `/{entities}` | Aggregate | **200 OK**<br>Return List of `{Entity}` | Filter `{Entity}.IsActive = True` by default. Support pagination (`Page`, `PageSize`). |
| `GET` | `/{entities}/{Id}` | Aggregate | **200 OK**<br>Return `{Entity}` record | Filter `{Entity}.Id = Id AND {Entity}.IsActive = True`. If empty, `SetStatusCode(404)` and assign the not-found body. |
| `PUT` / `PATCH` | `/{entities}/{Id}` | `{Entity}_Upsert` | **200 OK**<br>Return `{ Id }` | Map route `Id` into `Source.Id`. If `IsSuccess = False`, `SetStatusCode(400)` with `CombinedEntityMessageText`. |
| `DELETE` | `/{entities}/{Id}` | `{Entity}_Remove` | **204 No Content** | On caught `ProcessingException` (from `_GetCanRemove`), `SetStatusCode(400)` or `404` with the exception message. |

### Standard Flow for Mutation Endpoints (POST / PUT)

1. Map Request payload into `Source` (`{Entity}` Record).
2. Call `{Entity}_Upsert(Source)`.
3. Check `EntityActionResult.IsSuccess`:
   - **True:** `SetStatusCode(201)` (POST) or `200` (PUT), map output `Id` to the response, End.
   - **False:** `SetStatusCode(400)` or `409`, map `CombinedEntityMessageText` to the error response, End.
4. Exception Handler — catch `AllExceptions`: `SetStatusCode(500)`, map `ExceptionMessage`, End.

> **Do not raise an exception on error paths you want to return a custom body for.** Assign the body and reach a normal End. In O11 a raised, unhandled exception returns the platform's own error envelope and a 500/400 chosen by the platform, not your custom structure.

---

## 5. Instruction for BRD and Agent Scaffolding
- When generating a BRD for an O11 build, explicitly include the 6 standard fields and define these 4 action contracts so the module is built with the correct architecture from the start.
- Build the module through the Service Studio MCP server: `getDataModel` first, mutate with `applyModelApiCode`, verify with a follow-up `get*`, then `omlMerge`.
- When writing integration tests (e.g. Vitest), assert soft deletes by checking that a removed record is excluded from active lists and that re-removal returns the `_GetCanRemove` "already removed" message.
