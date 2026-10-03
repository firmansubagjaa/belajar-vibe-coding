import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { posts, users } from "../src/schema";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();
const db = drizzle(client);

try {
  // Hapus semua posts dulu (karena foreign key ke users)
  await db.delete(posts);
  console.log("✓ Semua posts dihapus");

  // Hapus semua users
  await db.delete(users);
  console.log("✓ Semua users dihapus");

  console.log("✓ Data clearing selesai");
} catch (error) {
  console.error("Error:", error);
} finally {
  await client.end();
}
