/**
 * Unit tests for OutSystemsClient
 *
 * These tests run fully offline — no real HTTP requests are made.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { OutSystemsClient } from "../src/client.js";

describe("OutSystemsClient", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ result: "ok" }),
        text: async () => "",
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when no base URL is provided and env var is unset", () => {
    const original = process.env.OUTSYSTEMS_BASE_URL;
    delete process.env.OUTSYSTEMS_BASE_URL;

    expect(() => new OutSystemsClient()).toThrow(
      "base URL is required"
    );

    if (original !== undefined) process.env.OUTSYSTEMS_BASE_URL = original;
  });

  it("strips trailing slash from base URL", async () => {
    const c = new OutSystemsClient("https://example.outsystemscloud.com/");
    await c.get("/api/v1/resource");

    const [calledUrl] = vi.mocked(fetch).mock.calls[0] as [string, ...unknown[]];
    expect(calledUrl).toBe(
      "https://example.outsystemscloud.com/api/v1/resource"
    );
  });

  it("appends query params to the URL", async () => {
    const c = new OutSystemsClient("https://example.outsystemscloud.com");
    await c.get("/employees", { params: { page: 2, pageSize: 5 } });

    const [calledUrl] = vi.mocked(fetch).mock.calls[0] as [string, ...unknown[]];
    expect(calledUrl).toContain("page=2");
    expect(calledUrl).toContain("pageSize=5");
  });

  it("sends JSON body on POST", async () => {
    const c = new OutSystemsClient("https://example.outsystemscloud.com");
    await c.post("/employees", { Name: "Test" });

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ Name: "Test" }));
  });

  it("attaches X-API-Key header when api key is provided", async () => {
    const c = new OutSystemsClient(
      "https://example.outsystemscloud.com",
      "super-secret-key"
    );
    await c.get("/employees");

    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["X-API-Key"]).toBe(
      "super-secret-key"
    );
  });

  it("returns ok:false for 4xx responses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ Message: "Not found" }),
      text: async () => "",
    } as unknown as Response);

    const c = new OutSystemsClient("https://example.outsystemscloud.com");
    const res = await c.get("/employees/999");
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
  });
});
