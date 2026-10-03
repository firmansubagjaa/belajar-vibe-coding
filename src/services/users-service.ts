import { db } from "../db";
import { users } from "../schema";
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
