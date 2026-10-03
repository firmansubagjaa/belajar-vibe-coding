import { db } from "../db";
import { users, sessions } from "../schema";
import { eq } from "drizzle-orm";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CurrentUserResponse {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

/**
 * Register a new user
 * @throws Error if email already exists
 */
export async function registerUser(input: RegisterInput): Promise<UserResponse> {
  // Cek email sudah terdaftar atau belum
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("Email sudah terdaftar");
  }

  try {
    // Hash password dengan bcrypt (Bun built-in)
    const hashedPassword = await Bun.password.hash(input.password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    // Simpan user baru
    const result = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        password: hashedPassword,
      })
      .returning();

    const newUser = result[0];
    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.createdAt,
    };
  } catch (error) {
    console.error("Error in registerUser:", error);
    throw error;
  }
}

/**
 * Login user
 * @throws Error if email not found or password incorrect
 */
export async function loginUser(input: LoginInput): Promise<string> {
  try {
    // Cari user berdasarkan email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (user.length === 0) {
      throw new Error("Email atau password salah");
    }

    // Cocokkan password dengan hash di database
    const isPasswordValid = await Bun.password.verify(
      input.password,
      user[0].password
    );

    if (!isPasswordValid) {
      throw new Error("Email atau password salah");
    }

    // Buat token UUID
    const token = crypto.randomUUID();

    // Simpan session ke database
    await db.insert(sessions).values({
      token,
      userId: user[0].id,
    });

    return token;
  } catch (error) {
    if (error instanceof Error && error.message === "Email atau password salah") {
      throw error;
    }
    console.error("Error in loginUser:", error);
    throw new Error("Email atau password salah");
  }
}

/**
 * Get current user by token
 * @throws Error("Unauthorized") jika token atau user tidak ditemukan
 * Error lain (misal database error) dilempar apa adanya supaya route membalas 500
 */
export async function getCurrentUser(token: string): Promise<CurrentUserResponse> {
  // Cari session berdasarkan token
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Cari user berdasarkan user_id dari session
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Return user data tanpa password
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.createdAt.toISOString(),
  };
}


/**
 * Logout user - hapus session berdasarkan token
 * Hanya session dengan token ini yang dihapus, session di device lain tetap aktif
 * @throws Error("Unauthorized") jika token tidak ditemukan
 */
export async function logoutUser(token: string): Promise<void> {
  const deleted = await db
    .delete(sessions)
    .where(eq(sessions.token, token))
    .returning({ id: sessions.id });

  if (deleted.length === 0) {
    throw new Error("Unauthorized");
  }
}
