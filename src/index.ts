import { Hono } from "hono";
import { db } from "./db";
import { users, posts } from "./schema";
import { eq } from "drizzle-orm";
import usersRoute from "./routes/users-route";

const app = new Hono();

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", message: "Server is running" });
});

// ===== API ROUTES =====
app.route("/api/users", usersRoute);

// ===== LEGACY USER ENDPOINTS (GET/UPDATE/DELETE) =====

// Get all users
app.get("/users", async (c) => {
  const allUsers = await db.select().from(users);
  return c.json(allUsers);
});

// Get user by ID
app.get("/users/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return c.json(user[0] || { error: "User not found" });
});

// Update user
app.put("/users/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const result = await db
    .update(users)
    .set({
      name: body.name,
      email: body.email,
    })
    .where(eq(users.id, id))
    .returning();
  return c.json(result[0] || { error: "User not found" });
});

// Delete user
app.delete("/users/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(users).where(eq(users.id, id));
  return c.json({ message: "User deleted successfully" });
});

// ===== POST ENDPOINTS =====

// Get all posts
app.get("/posts", async (c) => {
  const allPosts = await db.select().from(posts);
  return c.json(allPosts);
});

// Get post by ID
app.get("/posts/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const post = await db
    .select()
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  return c.json(post[0] || { error: "Post not found" });
});

// Create post
app.post("/posts", async (c) => {
  const body = await c.req.json();
  const result = await db
    .insert(posts)
    .values({
      title: body.title,
      content: body.content,
      authorId: body.authorId,
    })
    .returning();
  return c.json(result[0]);
});

// Update post
app.put("/posts/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const result = await db
    .update(posts)
    .set({
      title: body.title,
      content: body.content,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))
    .returning();
  return c.json(result[0] || { error: "Post not found" });
});

// Delete post
app.delete("/posts/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(posts).where(eq(posts.id, id));
  return c.json({ message: "Post deleted successfully" });
});

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};
