# Project Context
- **Application**: Employee Catalog
- **Platform**: OutSystems 11 (O11)
- **Build tool**: Service Studio + Service Studio MCP server (`applyModelApiCode` / `omlMerge`)
- **Harness / Test Tool**: Vitest (REST integration + offline unit tests)
- **Test Command**: `npm test`
- **Architecture**: Reactive Web screens + server-action CRUD wrappers + exposed REST API over core entities

---

# Use Case Catalog

## Use Case #1: Create Employee Record
**Description**:
An HR user wants to create an employee record with FirstName, LastName, Department, and Email. The system must generate a unique identifier and reject any duplicate email addresses.

**Status**: In Progress
**Current Phase**: Green
**Last Phase Completed**: Green (verified against the live EmployeeCatalog_CS module on the deployed OutSystems 11 environment)
**Last Updated**: 2026-10-09
**Test Count**: 20 tests (14 live-API integration + 6 offline client unit tests)
**Test File**: `tests/create-employee.test.ts`
**Last Live Run**: 2026-10-09, against the published `EmployeeCatalog_CS` module. All 4 Use Case #1 scenarios passed live: S1 (3 tests) 201 + generated Id + echoed fields; S2 duplicate email → 409; S3 missing Email → 400 with Errors array; S4 empty JSON `{}` → 400 with { Errors, StatusCode } listing missing required fields. Full suite 20/20 green.

> Note: Green was claimed only after a live run passed against the deployed EmployeeAPI (`OUTSYSTEMS_BASE_URL` set to the published endpoint). The mock run (OUTSYSTEMS_BASE_URL unset) remains available for CI without a live backend.

### Scenarios (GWT)

**Scenario 1 — Happy path: create a valid employee**
```gherkin
Given a valid payload with FirstName, LastName, Department, and an Email that is unique to this test run
When POST /employees is called
Then the response status is 201
And the response body contains the generated Id (Long Integer, > 0)
And the response body echoes back FirstName, LastName, Department, and Email
```

**Scenario 2 — Duplicate email rejected**
```gherkin
Given an employee has just been created with a unique email for this test run
When POST /employees is called again with the same email
Then the response status is 409
And the response body contains an error message referencing the duplicate email
```

**Scenario 3 — Missing required field (e.g. Email omitted)**
```gherkin
Given a payload that omits the Email field
When POST /employees is called
Then the response status is 400
And the response body contains { "Errors": [...], "StatusCode": 400 } with an Errors entry naming the missing field
```

**Scenario 4 — Empty request body**
```gherkin
Given a request with no body
When POST /employees is called
Then the response status is 400
And the response body is the platform's built-in request-validation error
Note: this body is produced by the O11 REST framework before the action flow runs, so it differs from the custom Errors/StatusCode shape used by Scenario 3.
```

---

## Use Case #2: Filter Active Employees by Department
**Description**:
Retrieve all active employees belonging to a specific department, ignoring inactive staff.
