import { Hono } from "hono";
import { registerUser, loginUser, getCurrentUser, logoutUser } from "../services/users-service";

const router = new Hono();

/**
 * Ambil token dari header "Authorization: Bearer <token>"
 * @returns token, atau null jika header tidak ada / formatnya salah / token kosong
 */
function extractBearerToken(header: string | undefined): string | null {
  if (!header || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice(7).trim();
  return token || null;
}

/**
 * POST /
 * Register a new user
 */
router.post("/", async (c) => {
  try {
    const body = await c.req.json();

    // Validasi input minimal
    if (!body.name || !body.email || !body.password) {
      return c.json(
        { error: "name, email, dan password harus diisi" },
        400
      );
    }

    // Panggil service untuk registrasi
    await registerUser({
      name: body.name,
      email: body.email,
      password: body.password,
    });

    // Response sukses
    return c.json({ data: "OK" });
  } catch (error) {
    // Tangkap error dari service
    if (error instanceof Error) {
      if (error.message === "Email sudah terdaftar") {
        return c.json({ error: "Email sudah terdaftar" }, 400);
      }
      console.error("Service error:", error.message);
    }

    // Error lain
    console.error("Unexpected error:", error);
    return c.json({ error: "Registrasi gagal" }, 500);
  }
});

/**
 * POST /login
 * Login user
 */
router.post("/login", async (c) => {
  try {
    const body = await c.req.json();

    // Validasi input minimal
    if (!body.email || !body.password) {
      return c.json(
        { error: "email dan password harus diisi" },
        400
      );
    }

    // Panggil service untuk login
    const token = await loginUser({
      email: body.email,
      password: body.password,
    });

    // Response sukses dengan token
    return c.json({ data: token });
  } catch (error) {
    // Tangkap error dari service
    if (error instanceof Error) {
      if (error.message === "Email atau password salah") {
        return c.json({ error: "Email atau password salah" }, 401);
      }
      console.error("Service error:", error.message);
    }

    // Error lain
    console.error("Unexpected error:", error);
    return c.json({ error: "Login gagal" }, 500);
  }
});

/**
 * GET /current
 * Get current logged in user
 */
router.get("/current", async (c) => {
  try {
    // Ambil token dari header Authorization
    const token = extractBearerToken(c.req.header("Authorization"));

    if (!token) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Panggil service untuk mendapatkan user
    const user = await getCurrentUser(token);

    // Response sukses dengan data user
    return c.json({ data: user });
  } catch (error) {
    // Tangkap error dari service
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return c.json({ error: "Unauthorized" }, 401);
      }
      console.error("Service error:", error.message);
    }

    // Error lain
    console.error("Unexpected error:", error);
    return c.json({ error: "Get user gagal" }, 500);
  }
});

/**
 * DELETE /logout
 * Logout user - delete session by token
 */
router.delete("/logout", async (c) => {
  try {
    // Ambil token dari header Authorization
    const token = extractBearerToken(c.req.header("Authorization"));

    if (!token) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Panggil service untuk logout
    await logoutUser(token);

    // Response sukses
    return c.json({ data: "OK" });
  } catch (error) {
    // Tangkap error dari service
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return c.json({ error: "Unauthorized" }, 401);
      }
      console.error("Service error:", error.message);
    }

    // Error lain
    console.error("Unexpected error:", error);
    return c.json({ error: "Logout gagal" }, 500);
  }
});

export default router;
