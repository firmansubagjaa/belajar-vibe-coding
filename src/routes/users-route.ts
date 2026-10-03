import { Hono } from "hono";
import { registerUser } from "../services/users-service";

const router = new Hono();

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

export default router;
