import { migrate } from "drizzle-orm/mysql2/migrator";
import { db, conn } from "../api/queries/connection";

async function runMigrations() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("Migrations completed.");
  await conn.end();
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
