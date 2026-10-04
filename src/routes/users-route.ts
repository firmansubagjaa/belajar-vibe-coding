import { Hono } from "hono";
import { registerUser, loginUser, getCurrentUser, logoutUser } from "../services/users-service";
import {
  UnauthorizedError,
  InvalidCredentialsError,
  EmailAlreadyExistsError,
} from "../errors";

const router = new Hono();

const MAX_NAME_LENGTH = 255;
const MAX_EMAIL_LENGTH = 255;

/**
 * Ambil token dari header "Authorization: Bearer <token>" atau "Authorization: bearer <token>"
 * Case-insensitive: both "Bearer" and "bearer" are accepted
 * @returns token, atau null jika header tidak ada / formatnya salah / token kosong
 */
function extractBearerToken(header: string | undefined): string | null {
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
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

    // Validasi tipe dan panjang name
    if (typeof body.name !== "string") {
      return c.json({ error: "name harus berupa string" }, 400);
    }
    if (body.name.length > MAX_NAME_LENGTH) {
      return c.json({ error: "name maksimal 255 karakter" }, 400);
    }

    // Validasi tipe dan panjang email
    if (typeof body.email !== "string") {
      return c.json({ error: "email harus berupa string" }, 400);
    }
    if (body.email.length > MAX_EMAIL_LENGTH) {
      return c.json({ error: "email maksimal 255 karakter" }, 400);
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
    if (error instanceof EmailAlreadyExistsError) {
      return c.json({ error: "Email sudah terdaftar" }, 400);
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
    if (error instanceof InvalidCredentialsError) {
      return c.json({ error: "Email atau password salah" }, 401);
    }

    // Error lain (termasuk DB error)
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
    if (error instanceof UnauthorizedError) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Error lain (termasuk DB error)
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
    if (error instanceof UnauthorizedError) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Error lain (termasuk DB error)
    console.error("Unexpected error:", error);
    return c.json({ error: "Logout gagal" }, 500);
  }
});

export default router;
