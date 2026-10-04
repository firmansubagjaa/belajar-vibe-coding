import { db } from "../src/db";
import { users, sessions, posts } from "../src/schema";
import { eq } from "drizzle-orm";
import app from "../src/index";

/**
 * Reset database for tests
 * Order: delete sessions → delete posts → delete users (respects foreign keys)
 */
export async function resetDatabase(): Promise<void> {
  // Delete all sessions first (references users)
  await db.delete(sessions);
  
  // Delete all posts (references users)
  await db.delete(posts);
  
  // Delete all users
  await db.delete(users);
}

/**
 * Make HTTP request to the app
 * Calls the exported fetch handler directly (no server startup)
 */
export async function request(
  method: string,
  path: string,
  options?: {
    body?: Record<string, unknown>;
    token?: string;
  }
): Promise<Response> {
  const url = `http://localhost:3000${path}`;
  const requestInit: RequestInit = {
    method,
  };

  // Add Authorization header if token provided
  if (options?.token) {
    requestInit.headers = {
      "Authorization": `Bearer ${options.token}`,
    };
  }

  // Add JSON body if provided
  if (options?.body) {
    requestInit.headers = {
      ...requestInit.headers,
      "Content-Type": "application/json",
    };
    requestInit.body = JSON.stringify(options.body);
  }

  // Call the app's fetch handler directly
  const response = await app.fetch(new Request(url, requestInit));
  return response;
}

/**
 * Create a test user and return user data
 */
export async function createTestUser(
  name: string,
  email: string,
  password: string
): Promise<{ id: number; name: string; email: string; createdAt: Date }> {
  const response = await request("POST", "/api/users", {
    body: { name, email, password },
  });

  if (response.status !== 200) {
    throw new Error(
      `Failed to create user: ${response.status} ${await response.text()}`
    );
  }

  // Get the created user from database to return full user object
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    throw new Error("User created but not found in database");
  }

  return user;
}

/**
 * Login a test user and return the token
 */
export async function loginTestUser(
  email: string,
  password: string
): Promise<string> {
  const response = await request("POST", "/api/users/login", {
    body: { email, password },
  });

  if (response.status !== 200) {
    throw new Error(
      `Failed to login: ${response.status} ${await response.text()}`
    );
  }

  const json = await response.json() as { data?: string; error?: string };
  if (!json.data || typeof json.data !== "string") {
    throw new Error("Login did not return a token");
  }

  return json.data;
}

/**
 * Get a user by email from database (for verification)
 */
export async function getUserByEmail(
  email: string
): Promise<(typeof users.$inferSelect) | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user || null;
}

/**
 * Get a session by token from database (for verification)
 */
export async function getSessionByToken(
  token: string
): Promise<(typeof sessions.$inferSelect) | null> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);
  return session || null;
}

/**
 * Get a post by ID from database (for verification)
 */
export async function getPostById(
  id: number
): Promise<(typeof posts.$inferSelect) | null> {
  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  return post || null;
}

/**
 * Get all users from database (for verification)
 */
export async function getAllUsers(): Promise<(typeof users.$inferSelect)[]> {
  return await db.select().from(users);
}

/**
 * Get all sessions from database (for verification)
 */
export async function getAllSessions(): Promise<(typeof sessions.$inferSelect)[]> {
  return await db.select().from(sessions);
}

/**
 * Get all posts from database (for verification)
 */
export async function getAllPosts(): Promise<(typeof posts.$inferSelect)[]> {
  return await db.select().from(posts);
}
