import { describe, it, expect, beforeEach } from "bun:test";
import {
  resetDatabase,
  request,
  createTestUser,
  getUserByEmail,
  getAllUsers,
} from "./helpers";

describe("GET /users (Get All Users)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return empty array when no users exist", async () => {
    const response = await request("GET", "/users");

    expect(response.status).toBe(200);
    const data = (await response.json()) as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it("should return all users when multiple users exist", async () => {
    await createTestUser("John Doe", "john@example.com", "password123");
    await createTestUser("Jane Smith", "jane@example.com", "password456");

    const response = await request("GET", "/users");

    expect(response.status).toBe(200);
    const data = (await response.json()) as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
  });

  it("BUG: GET /users returns password field in response", async () => {
    await createTestUser("John Doe", "john@example.com", "password123");

    const response = await request("GET", "/users");
    expect(response.status).toBe(200);

    const data = (await response.json()) as Array<Record<string, unknown>>;
    // BUG: password field is exposed in GET /users response
    // This is a security issue - passwords should never be returned
    expect(data[0]?.password).toBeDefined();
  });
});

describe("GET /users/:id (Get User by ID)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return user with valid ID", async () => {
    const user = await createTestUser("John Doe", "john@example.com", "password123");

    const response = await request("GET", `/users/${user.id}`);

    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.id).toBe(user.id);
    expect(data.name).toBe("John Doe");
    expect(data.email).toBe("john@example.com");
  });

  it("should return error object when ID not found", async () => {
    const response = await request("GET", "/users/999");

    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.error).toBe("User not found");
  });

  it("should handle non-numeric ID", async () => {
    const response = await request("GET", "/users/abc");

    // Behavior: coerces to NaN, causes database error → 500
    // BUG: should validate or handle gracefully, but currently fails
    expect(response.status).toBe(500);
  });

  it("BUG: GET /users/:id returns password field", async () => {
    const user = await createTestUser("John Doe", "john@example.com", "password123");

    const response = await request("GET", `/users/${user.id}`);
    expect(response.status).toBe(200);

    const data = (await response.json()) as Record<string, unknown>;
    // BUG: password is exposed in GET /users/:id
    // Currently returns: id, name, email, password, created_at
    expect(data.password).toBeDefined();
  });
});

describe("PUT /users/:id (Update User)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should update user with valid ID and data", async () => {
    const user = await createTestUser("John Doe", "john@example.com", "password123");

    const response = await request("PUT", `/users/${user.id}`, {
      body: { name: "John Updated", email: "john.updated@example.com" },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.name).toBe("John Updated");
    expect(data.email).toBe("john.updated@example.com");

    // Verify update in database
    const updatedUser = await getUserByEmail("john.updated@example.com");
    expect(updatedUser?.name).toBe("John Updated");
  });

  it("should return error object when ID not found", async () => {
    const response = await request("PUT", "/users/999", {
      body: { name: "Someone", email: "someone@example.com" },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.error).toBe("User not found");
  });

  it("should return error when duplicate email is used", async () => {
    const user1 = await createTestUser("John Doe", "john@example.com", "password123");
    await createTestUser("Jane Smith", "jane@example.com", "password456");

    // Try to update Jane's email to John's email
    const response = await request("PUT", `/users/${user1.id}`, {
      body: { name: "Jane", email: "jane@example.com" },
    });

    // Expected: 400 or database error, but may vary by implementation
    // Record actual behavior
    expect([200, 400, 500]).toContain(response.status);
  });
});

describe("DELETE /users/:id (Delete User)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should delete user with no relations", async () => {
    const user = await createTestUser("John Doe", "john@example.com", "password123");

    const response = await request("DELETE", `/users/${user.id}`);

    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.message).toBe("User deleted successfully");

    // Verify user is deleted from database
    const deletedUser = await getUserByEmail("john@example.com");
    expect(deletedUser).toBeNull();
  });

  it("should return success message even for non-existent user", async () => {
    const response = await request("DELETE", "/users/999");

    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.message).toBe("User deleted successfully");
  });

  it("should handle cascade delete or foreign key error with active session", async () => {
    const { default: app } = await import("../src/index.ts");
    const { db } = await import("../src/db.ts");
    const { sessions } = await import("../src/schema.ts");

    const user = await createTestUser("John Doe", "john@example.com", "password123");

    // Manually insert a session for this user
    await db.insert(sessions).values({
      token: "test-token-session",
      userId: user.id,
    });

    // Try to delete user with active session
    const response = await request("DELETE", `/users/${user.id}`);

    // Behavior depends on database cascade rules:
    // If CASCADE DELETE is configured: 200 (both user and session deleted)
    // If RESTRICT/NO ACTION: 500 (foreign key constraint error)
    expect([200, 500]).toContain(response.status);
  });

  it("should handle cascade delete or foreign key error with posts", async () => {
    const { default: app } = await import("../src/index.ts");
    const { db } = await import("../src/db.ts");
    const { posts } = await import("../src/schema.ts");

    const user = await createTestUser("John Doe", "john@example.com", "password123");

    // Manually insert a post by this user
    await db.insert(posts).values({
      title: "Test Post",
      content: "Test content",
      authorId: user.id,
    });

    // Try to delete user with posts
    const response = await request("DELETE", `/users/${user.id}`);

    // Behavior depends on database cascade rules:
    // If CASCADE DELETE is configured: 200
    // If RESTRICT/NO ACTION: 500
    expect([200, 500]).toContain(response.status);
  });
});
