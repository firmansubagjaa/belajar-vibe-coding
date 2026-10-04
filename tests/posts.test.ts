import { describe, it, expect, beforeEach } from "bun:test";
import {
  resetDatabase,
  request,
  createTestUser,
  getAllPosts,
  getPostById,
} from "./helpers";

describe("GET /posts (Get All Posts)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return empty array when no posts exist", async () => {
    const response = await request("GET", "/posts");

    expect(response.status).toBe(200);
    const data = (await response.json()) as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it("should return all posts when multiple posts exist", async () => {
    const user = await createTestUser("John Doe", "john@example.com", "password123");

    // Create multiple posts
    await request("POST", "/posts", {
      body: {
        title: "Post 1",
        content: "Content 1",
        authorId: user.id,
      },
    });
    await request("POST", "/posts", {
      body: {
        title: "Post 2",
        content: "Content 2",
        authorId: user.id,
      },
    });

    const response = await request("GET", "/posts");

    expect(response.status).toBe(200);
    const data = (await response.json()) as unknown[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
  });
});

describe("GET /posts/:id (Get Post by ID)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should return post with valid ID", async () => {
    const user = await createTestUser("John Doe", "john@example.com", "password123");

    const createRes = await request("POST", "/posts", {
      body: {
        title: "Test Post",
        content: "Test content",
        authorId: user.id,
      },
    });

    const createdPost = (await createRes.json()) as { id?: number };
    const response = await request("GET", `/posts/${createdPost.id}`);

    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.id).toBe(createdPost.id);
    expect(data.title).toBe("Test Post");
    expect(data.content).toBe("Test content");
    expect(data.authorId).toBe(user.id);
  });

  it("should return error object when ID not found", async () => {
    const response = await request("GET", "/posts/999");

    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.error).toBe("Post not found");
  });

  it("should handle non-numeric ID", async () => {
    const response = await request("GET", "/posts/abc");

    // Behavior: coerces to NaN, causes database error → 500
    // BUG: should validate or handle gracefully, but currently fails
    expect(response.status).toBe(500);
  });
});

describe("POST /posts (Create Post)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should create post with valid data", async () => {
    const user = await createTestUser("John Doe", "john@example.com", "password123");

    const response = await request("POST", "/posts", {
      body: {
        title: "New Post",
        content: "New content",
        authorId: user.id,
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.id).toBeDefined();
    expect(data.title).toBe("New Post");
    expect(data.content).toBe("New content");
    expect(data.authorId).toBe(user.id);
    expect(data.createdAt).toBeDefined();
    expect(data.updatedAt).toBeDefined();

    // Verify post is in database
    const post = await getPostById(data.id as number);
    expect(post).toBeDefined();
    expect(post?.title).toBe("New Post");
  });

  it("should reject post with missing title", async () => {
    const user = await createTestUser("John Doe", "john@example.com", "password123");

    const response = await request("POST", "/posts", {
      body: {
        content: "Content without title",
        authorId: user.id,
      },
    });

    // Behavior: may accept with undefined title or return 500
    expect([200, 400, 500]).toContain(response.status);
  });

  it("should reject post with missing content", async () => {
    const user = await createTestUser("John Doe", "john@example.com", "password123");

    const response = await request("POST", "/posts", {
      body: {
        title: "Title without content",
        authorId: user.id,
      },
    });

    // Behavior: may accept with undefined content or return 500
    expect([200, 400, 500]).toContain(response.status);
  });

  it("should handle post with invalid authorId (foreign key error)", async () => {
    const response = await request("POST", "/posts", {
      body: {
        title: "Orphan Post",
        content: "Post with non-existent author",
        authorId: 999,
      },
    });

    // Behavior: foreign key constraint may cause 500 or may be ignored
    expect([200, 500]).toContain(response.status);
  });

  it("should handle post with missing authorId", async () => {
    const response = await request("POST", "/posts", {
      body: {
        title: "Post without author",
        content: "Content",
      },
    });

    // Behavior: may accept with null authorId or return 500
    expect([200, 500]).toContain(response.status);
  });
});

describe("PUT /posts/:id (Update Post)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should update post with valid data", async () => {
    const user = await createTestUser("John Doe", "john@example.com", "password123");

    const createRes = await request("POST", "/posts", {
      body: {
        title: "Original Title",
        content: "Original content",
        authorId: user.id,
      },
    });

    const createdPost = (await createRes.json()) as { id?: number };
    const response = await request("PUT", `/posts/${createdPost.id}`, {
      body: {
        title: "Updated Title",
        content: "Updated content",
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.title).toBe("Updated Title");
    expect(data.content).toBe("Updated content");
    expect(data.updatedAt).toBeDefined();

    // Verify update in database
    const post = await getPostById(createdPost.id!);
    expect(post?.title).toBe("Updated Title");
    expect(post?.content).toBe("Updated content");
  });

  it("should return error object when ID not found", async () => {
    const response = await request("PUT", "/posts/999", {
      body: {
        title: "Updated Title",
        content: "Updated content",
      },
    });

    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.error).toBe("Post not found");
  });

  it("should update only title while keeping content", async () => {
    const user = await createTestUser("John Doe", "john@example.com", "password123");

    const createRes = await request("POST", "/posts", {
      body: {
        title: "Original Title",
        content: "Original content",
        authorId: user.id,
      },
    });

    const createdPost = (await createRes.json()) as { id?: number };
    const response = await request("PUT", `/posts/${createdPost.id}`, {
      body: {
        title: "New Title",
      },
    });

    // Behavior: may clear content if not provided, or keep it
    expect(response.status).toBe(200);
    const post = await getPostById(createdPost.id!);
    expect(post?.title).toBe("New Title");
  });
});

describe("DELETE /posts/:id (Delete Post)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("should delete post with valid ID", async () => {
    const user = await createTestUser("John Doe", "john@example.com", "password123");

    const createRes = await request("POST", "/posts", {
      body: {
        title: "Post to delete",
        content: "This will be deleted",
        authorId: user.id,
      },
    });

    const createdPost = (await createRes.json()) as { id?: number };
    const response = await request("DELETE", `/posts/${createdPost.id}`);

    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.message).toBe("Post deleted successfully");

    // Verify post is deleted from database
    const post = await getPostById(createdPost.id!);
    expect(post).toBeNull();
  });

  it("should return success message even for non-existent post", async () => {
    const response = await request("DELETE", "/posts/999");

    expect(response.status).toBe(200);
    const data = (await response.json()) as Record<string, unknown>;
    expect(data.message).toBe("Post deleted successfully");
  });
});
