import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { sessions } from "../src/schema";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();
const db = drizzle(client);

try {
  const allSessions = await db.select().from(sessions);
  console.log(`\n✓ Total sessions: ${allSessions.length}`);
  console.log("\nRecent sessions:");
  allSessions.slice(-3).forEach((session) => {
    console.log(`- Token: ${session.token.substring(0, 13)}...`);
    console.log(`  User ID: ${session.userId}`);
    console.log(`  Created: ${session.createdAt}`);
  });
} catch (error) {
  console.error("Error:", error);
} finally {
  await client.end();
}
