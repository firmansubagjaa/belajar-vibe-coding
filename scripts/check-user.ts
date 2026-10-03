import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { users } from "../src/schema";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();
const db = drizzle(client);

try {
  const allUsers = await db.select().from(users);
  console.log("Users in database:");
  allUsers.forEach((user) => {
    console.log(
      `- ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Password: ${user.password.substring(0, 20)}...`
    );
    console.log(
      `  Password starts with $2: ${user.password.startsWith("$2") ? "✓ YES (bcrypt hash)" : "✗ NO (plaintext!)"}`
    );
  });
} catch (error) {
  console.error("Error:", error);
} finally {
  await client.end();
}
