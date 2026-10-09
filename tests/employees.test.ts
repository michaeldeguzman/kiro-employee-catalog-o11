/**
 * Employee Catalog — REST endpoint tests
 *
 * These tests target the OutSystems Employee Catalog REST API.
 * Set OUTSYSTEMS_BASE_URL (and optionally OUTSYSTEMS_API_KEY) in .env
 * before running.
 *
 * Run:  npm test
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import { OutSystemsClient } from "../src/client.js";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Employee {
  Id: number;
  FirstName: string;
  LastName: string;
  Email: string;
  Department: string;
  JobTitle: string;
}

interface EmployeeListResponse {
  Employees: Employee[];
  TotalCount: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns a client pointed at the real API when OUTSYSTEMS_BASE_URL is set,
 * or a mock client with a stubbed fetch so unit tests pass in CI without a
 * live environment.
 */
function makeClient() {
  if (process.env.OUTSYSTEMS_BASE_URL) {
    return new OutSystemsClient();
  }

  // Stub global fetch so the client can still be instantiated and exercised
  const mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);

  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () =>
      ({
        Employees: [
          {
            Id: 1,
            FirstName: "Alice",
            LastName: "Example",
            Email: "alice@example.com",
            Department: "Engineering",
            JobTitle: "Software Developer",
          },
        ],
        TotalCount: 1,
      } satisfies EmployeeListResponse),
    text: async () => "",
  });

  return new OutSystemsClient("https://mock.outsystems.example");
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Employee Catalog API", () => {
  let client: OutSystemsClient;

  beforeAll(() => {
    client = makeClient();
  });

  // ── GET /employees ─────────────────────────────────────────────────────

  describe("GET /employees", () => {
    it("returns a 200 status", async () => {
      const res = await client.get("/employees");
      expect(res.status).toBe(200);
    });

    it("responds with an Employees array", async () => {
      const res = await client.get<EmployeeListResponse>("/employees");
      expect(res.ok).toBe(true);
      expect(res.data).toHaveProperty("Employees");
      expect(Array.isArray(res.data.Employees)).toBe(true);
    });

    it("each employee has required fields", async () => {
      const res = await client.get<EmployeeListResponse>("/employees");
      for (const emp of res.data.Employees) {
        expect(emp).toHaveProperty("Id");
        expect(emp).toHaveProperty("FirstName");
        expect(emp).toHaveProperty("LastName");
        expect(emp).toHaveProperty("Email");
        expect(emp).toHaveProperty("Department");
      }
    });

    it("supports pagination params", async () => {
      const res = await client.get<EmployeeListResponse>("/employees", {
        params: { page: 1, pageSize: 10 },
      });
      expect(res.status).toBe(200);
    });
  });

  // ── GET /employees/:id ─────────────────────────────────────────────────

  describe("GET /employees/:id", () => {
    it("returns a single employee when given a valid ID", async () => {
      // Re-stub for a single-employee response
      const singleEmployee: Employee = {
        Id: 1,
        FirstName: "Alice",
        LastName: "Example",
        Email: "alice@example.com",
        Department: "Engineering",
        JobTitle: "Software Developer",
      };

      if (!process.env.OUTSYSTEMS_BASE_URL) {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => singleEmployee,
          text: async () => "",
        } as unknown as Response);
      }

      const res = await client.get<Employee>("/employees/1");
      expect(res.status).toBe(200);
      expect(res.data).toMatchObject({ Id: 1 });
    });

    it("returns 404 for a non-existent employee", async () => {
      if (!process.env.OUTSYSTEMS_BASE_URL) {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 404,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ Message: "Employee not found" }),
          text: async () => "",
        } as unknown as Response);
      }

      const res = await client.get("/employees/999999");
      expect(res.status).toBe(404);
    });
  });

  // ── POST /employees ────────────────────────────────────────────────────

  describe("POST /employees", () => {
    it("creates a new employee and returns 201", async () => {
      const newEmployee = {
        FirstName: "Bob",
        LastName: "Tester",
        // Unique email per run so the live create path returns 201, not 409.
        Email: `bob.tester.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`,
        Department: "QA",
        JobTitle: "Test Engineer",
      };

      if (!process.env.OUTSYSTEMS_BASE_URL) {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ ...newEmployee, Id: 42 }),
          text: async () => "",
        } as unknown as Response);
      }

      const res = await client.post<Employee>("/employees", newEmployee);
      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty("Id");
    });

    it("returns 400 when required fields are missing", async () => {
      if (!process.env.OUTSYSTEMS_BASE_URL) {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status: 400,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ Message: "Name is required" }),
          text: async () => "",
        } as unknown as Response);
      }

      const res = await client.post("/employees", { Department: "IT" });
      expect(res.status).toBe(400);
    });
  });
});
