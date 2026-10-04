import { describe, it, expect, beforeEach } from "bun:test";
import { resetDatabase, request } from "./helpers";

describe("Health Check", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("GET /health should return 200 OK with status message", async () => {
    const response = await request("GET", "/health");

    expect(response.status).toBe(200);
    const data = (await response.json()) as { status?: string; message?: string };
    expect(data.status).toBe("ok");
    expect(data.message).toBeDefined();
  });
});
