import { describe, it, expect, beforeEach } from "bun:test";
import {
  resetDatabase,
  request,
  createTestUser,
  loginTestUser,
  getUserByEmail,
  getSessionByToken,
  getAllSessions,
} from "./helpers";

describe("POST /api/users (Register)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should register a new user with valid input", async () => {
    const response = await request("POST", "/api/users", {
      body: { name: "John Doe", email: "john@example.com", password: "password123" },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as { data?: string; error?: string };
    expect(data.data).toBe("OK");

    // Verify user is saved in database
    const user = await getUserByEmail("john@example.com");
    expect(user).toBeDefined();
    expect(user?.name).toBe("John Doe");
    expect(user?.email).toBe("john@example.com");
    // Password should be hashed, not plain text
    expect(user?.password).not.toBe("password123");
  });

  it("should reject duplicate email", async () => {
    await createTestUser("John Doe", "john@example.com", "password123");

    const response = await request("POST", "/api/users", {
      body: { name: "Jane Doe", email: "john@example.com", password: "password456" },
    });

    expect(response.status).toBe(400);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBe("Email sudah terdaftar");
  });

  it("should reject missing name", async () => {
    const response = await request("POST", "/api/users", {
      body: { email: "john@example.com", password: "password123" },
    });

    expect(response.status).toBe(400);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBeDefined();
  });

  it("should reject missing email", async () => {
    const response = await request("POST", "/api/users", {
      body: { name: "John Doe", password: "password123" },
    });

    expect(response.status).toBe(400);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBeDefined();
  });

  it("should reject missing password", async () => {
    const response = await request("POST", "/api/users", {
      body: { name: "John Doe", email: "john@example.com" },
    });

    expect(response.status).toBe(400);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBeDefined();
  });

  it("should reject empty string fields", async () => {
    const response = await request("POST", "/api/users", {
      body: { name: "", email: "john@example.com", password: "password123" },
    });

    expect(response.status).toBe(400);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBeDefined();
  });

  it("should reject non-string name", async () => {
    const response = await request("POST", "/api/users", {
      body: { name: 123, email: "john@example.com", password: "password123" },
    });

    expect(response.status).toBe(400);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBe("name harus berupa string");
  });

  it("should reject non-string email", async () => {
    const response = await request("POST", "/api/users", {
      body: { name: "John Doe", email: 123, password: "password123" },
    });

    expect(response.status).toBe(400);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBe("email harus berupa string");
  });

  it("should accept name with exactly 255 characters", async () => {
    const longName = "a".repeat(255);
    const response = await request("POST", "/api/users", {
      body: { name: longName, email: "john@example.com", password: "password123" },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as { data?: string };
    expect(data.data).toBe("OK");
  });

  it("should reject name longer than 255 characters", async () => {
    const longName = "a".repeat(256);
    const response = await request("POST", "/api/users", {
      body: { name: longName, email: "john@example.com", password: "password123" },
    });

    expect(response.status).toBe(400);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBe("name maksimal 255 karakter");
  });

  it("should reject email longer than 255 characters", async () => {
    const longEmail = "a".repeat(260) + "@example.com";
    const response = await request("POST", "/api/users", {
      body: { name: "John Doe", email: longEmail, password: "password123" },
    });

    expect(response.status).toBe(400);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBe("email maksimal 255 karakter");
  });
});

describe("POST /api/users/login (Login)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should login with valid credentials", async () => {
    await createTestUser("John Doe", "john@example.com", "password123");

    const response = await request("POST", "/api/users/login", {
      body: { email: "john@example.com", password: "password123" },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as { data?: string };
    expect(data.data).toBeDefined();
    expect(typeof data.data).toBe("string");

    // Verify session is saved in database
    const session = await getSessionByToken(data.data!);
    expect(session).toBeDefined();
    
    // Verify the user exists
    const user = await getUserByEmail("john@example.com");
    expect(user?.id).toBe(session?.userId);
  });

  it("should return different tokens for multiple logins", async () => {
    await createTestUser("John Doe", "john@example.com", "password123");

    const res1 = await request("POST", "/api/users/login", {
      body: { email: "john@example.com", password: "password123" },
    });
    const data1 = (await res1.json()) as { data?: string };

    const res2 = await request("POST", "/api/users/login", {
      body: { email: "john@example.com", password: "password123" },
    });
    const data2 = (await res2.json()) as { data?: string };

    expect(data1.data).not.toBe(data2.data);

    // Both tokens should be valid and in database
    const session1 = await getSessionByToken(data1.data!);
    const session2 = await getSessionByToken(data2.data!);
    expect(session1).toBeDefined();
    expect(session2).toBeDefined();
  });

  it("should reject login with email not found", async () => {
    const response = await request("POST", "/api/users/login", {
      body: { email: "nonexistent@example.com", password: "password123" },
    });

    expect(response.status).toBe(401);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBe("Email atau password salah");
  });

  it("should reject login with wrong password", async () => {
    await createTestUser("John Doe", "john@example.com", "password123");

    const response = await request("POST", "/api/users/login", {
      body: { email: "john@example.com", password: "wrongpassword" },
    });

    expect(response.status).toBe(401);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBe("Email atau password salah");
  });

  it("should reject missing email", async () => {
    const response = await request("POST", "/api/users/login", {
      body: { password: "password123" },
    });

    expect(response.status).toBe(400);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBeDefined();
  });

  it("should reject missing password", async () => {
    const response = await request("POST", "/api/users/login", {
      body: { email: "john@example.com" },
    });

    expect(response.status).toBe(400);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBeDefined();
  });
});

describe("GET /api/users/current (Get Current User)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should get current user with valid token", async () => {
    await createTestUser("John Doe", "john@example.com", "password123");
    const token = await loginTestUser("john@example.com", "password123");

    const response = await request("GET", "/api/users/current", { token });

    expect(response.status).toBe(200);
    const data = (await response.json()) as { data?: Record<string, unknown> };
    expect(data.data?.name).toBe("John Doe");
    expect(data.data?.email).toBe("john@example.com");
    // BUG: password should not be visible in response
    // Currently, GET /current returns: id, name, email, created_at (no password - CORRECT)
    expect(data.data?.password).toBeUndefined();
  });

  it("should reject request without Authorization header", async () => {
    const response = await request("GET", "/api/users/current");

    expect(response.status).toBe(401);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBe("Unauthorized");
  });

  it("should reject request without Bearer prefix", async () => {
    await createTestUser("John Doe", "john@example.com", "password123");
    const token = await loginTestUser("john@example.com", "password123");

    // Create request with Authorization header but without Bearer prefix
    const url = "http://localhost:3000/api/users/current";
    const requestInit: RequestInit = {
      method: "GET",
      headers: { Authorization: token }, // Missing "Bearer " prefix
    };
    const appResponse = await (await import("../src/index.ts")).default.fetch(
      new Request(url, requestInit)
    );

    expect(appResponse.status).toBe(401);
    const data = (await appResponse.json()) as { error?: string };
    expect(data.error).toBe("Unauthorized");
  });

  it("should reject request with Bearer but no token", async () => {
    const url = "http://localhost:3000/api/users/current";
    const requestInit: RequestInit = {
      method: "GET",
      headers: { Authorization: "Bearer " }, // Bearer prefix but no token
    };
    const appResponse = await (await import("../src/index.ts")).default.fetch(
      new Request(url, requestInit)
    );

    expect(appResponse.status).toBe(401);
    const data = (await appResponse.json()) as { error?: string };
    expect(data.error).toBe("Unauthorized");
  });

  it("should reject invalid token not in database", async () => {
    const response = await request("GET", "/api/users/current", {
      token: "invalid-token-not-in-db",
    });

    expect(response.status).toBe(401);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBe("Unauthorized");
  });

  it("should accept lowercase bearer prefix", async () => {
    await createTestUser("John Doe", "john@example.com", "password123");
    const token = await loginTestUser("john@example.com", "password123");

    const url = "http://localhost:3000/api/users/current";
    const requestInit: RequestInit = {
      method: "GET",
      headers: { Authorization: `bearer ${token}` }, // lowercase "bearer"
    };
    const appResponse = await (await import("../src/index.ts")).default.fetch(
      new Request(url, requestInit)
    );

    expect(appResponse.status).toBe(200);
    const data = (await appResponse.json()) as { data?: Record<string, unknown> };
    expect(data.data?.name).toBe("John Doe");
    expect(data.data?.email).toBe("john@example.com");
  });

  it("should reject token after logout", async () => {
    await createTestUser("John Doe", "john@example.com", "password123");
    const token = await loginTestUser("john@example.com", "password123");

    // Verify token works before logout
    let response = await request("GET", "/api/users/current", { token });
    expect(response.status).toBe(200);

    // Logout
    response = await request("DELETE", "/api/users/logout", { token });
    expect(response.status).toBe(200);

    // Token should no longer work
    response = await request("GET", "/api/users/current", { token });
    expect(response.status).toBe(401);
  });
});

describe("DELETE /api/users/logout (Logout)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should logout with valid token", async () => {
    await createTestUser("John Doe", "john@example.com", "password123");
    const token = await loginTestUser("john@example.com", "password123");

    const response = await request("DELETE", "/api/users/logout", { token });

    expect(response.status).toBe(200);
    const data = (await response.json()) as { data?: string };
    expect(data.data).toBe("OK");

    // Verify session is deleted from database
    const session = await getSessionByToken(token);
    expect(session).toBeNull();
  });

  it("should remove session from database after logout", async () => {
    await createTestUser("John Doe", "john@example.com", "password123");
    const token = await loginTestUser("john@example.com", "password123");

    // Verify session exists before logout
    let session = await getSessionByToken(token);
    expect(session).toBeDefined();

    // Logout
    await request("DELETE", "/api/users/logout", { token });

    // Verify session is gone
    session = await getSessionByToken(token);
    expect(session).toBeNull();
  });

  it("should reject logout with invalid token", async () => {
    const response = await request("DELETE", "/api/users/logout", {
      token: "invalid-token",
    });

    expect(response.status).toBe(401);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBe("Unauthorized");
  });

  it("should reject logout twice with same token", async () => {
    await createTestUser("John Doe", "john@example.com", "password123");
    const token = await loginTestUser("john@example.com", "password123");

    // First logout should succeed
    let response = await request("DELETE", "/api/users/logout", { token });
    expect(response.status).toBe(200);

    // Second logout with same token should fail
    response = await request("DELETE", "/api/users/logout", { token });
    expect(response.status).toBe(401);
  });

  it("should not delete other sessions of same user", async () => {
    await createTestUser("John Doe", "john@example.com", "password123");
    const token1 = await loginTestUser("john@example.com", "password123");
    const token2 = await loginTestUser("john@example.com", "password123");

    // Verify both sessions exist
    expect(await getSessionByToken(token1)).toBeDefined();
    expect(await getSessionByToken(token2)).toBeDefined();

    // Logout with token1
    await request("DELETE", "/api/users/logout", { token: token1 });

    // token1 should be gone, token2 should still work
    expect(await getSessionByToken(token1)).toBeNull();
    expect(await getSessionByToken(token2)).toBeDefined();

    // Verify token2 still works
    const response = await request("GET", "/api/users/current", { token: token2 });
    expect(response.status).toBe(200);
  });

  it("should reject logout without Authorization header", async () => {
    const response = await request("DELETE", "/api/users/logout");

    expect(response.status).toBe(401);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBe("Unauthorized");
  });

  it("should accept lowercase bearer prefix for logout", async () => {
    await createTestUser("John Doe", "john@example.com", "password123");
    const token = await loginTestUser("john@example.com", "password123");

    const url = "http://localhost:3000/api/users/logout";
    const requestInit: RequestInit = {
      method: "DELETE",
      headers: { Authorization: `bearer ${token}` }, // lowercase "bearer"
    };
    const appResponse = await (await import("../src/index.ts")).default.fetch(
      new Request(url, requestInit)
    );

    expect(appResponse.status).toBe(200);

    // Verify session is deleted
    const session = await getSessionByToken(token);
    expect(session).toBeNull();
  });
});
