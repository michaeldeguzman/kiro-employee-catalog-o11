# Product

This project builds the **Employee Catalog** application on **OutSystems 11 (O11)**. It is an internal HR application that centralises the management and browsing of employee records.

The O11 module is authored in **Service Studio** through the **Service Studio MCP server** (`servicestudio`, `http://127.0.0.1:41820/mcp`) using the `applyModelApiCode` write tool and the `get*` read tools. The repository's O11 skill lives in `servicestudio-mcp-oml/` — `SKILL.md` and the `reference/*.md` files are the source of truth for how to mutate the open `.oml` module.

## Purpose

- Let HR Administrators create, update, and soft-delete employee profiles.
- Give Directory Viewers a filtered, read-only view of active staff.
- Enforce uniqueness of employee email addresses.
- Track record-level audit history (who created and last updated each record).
- Expose a REST API for integration and automated testing.

## Domain

The application manages employee records with the following core fields:

| Field | Type | Notes |
|---|---|---|
| `Id` | Long Integer | Unique identifier (AutoNumber) |
| `FirstName` | Text | Given name |
| `LastName` | Text | Family name |
| `Email` | Email | Work email, unique across all records |
| `Department` | Text | Department / business unit |
| `JobTitle` | Text | Role / position (optional) |
| `IsActive` | Boolean | Soft-delete flag |

## Capabilities

- **Screens:** `Employee_List` (directory table) and `Employee_Detail` (create/edit form).
- **Server actions:** the four-action CRUD wrapper pattern (`Employee_Validate`, `Employee_Upsert`, `Employee_GetCanRemove`, `Employee_Remove`) plus shared `EntityActionResult` and `Session` helpers.
- **REST API (`EmployeeAPI`):** `POST /employees`, `GET /employees`, `GET /employees/{Id}`.

## Platform notes

- Target platform is **OutSystems 11**, module authored and published through Service Studio.
- The agent reads the live module first (`getDataModel`, `getScreen`, `getServerAction`, …), mutates via `applyModelApiCode`, and finalises every change through `omlMerge`.
- Writes go through the Beta `applyModelApiCode` / `omlMerge` tools — surface the Beta notice the first time a write tool is used in a conversation.
