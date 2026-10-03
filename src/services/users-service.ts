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
