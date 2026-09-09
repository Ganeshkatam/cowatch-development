import fs from "fs";
import { postgres } from "./server/utils/postgres.ts";

async function run() {
  if (!postgres) {
    console.error("Postgres not connected");
    process.exit(1);
  }
  const sql = fs.readFileSync("./sql/migrations/20260909_storage_policies.sql", "utf-8");
  try {
    await postgres.query(sql);
    console.log("Storage policies applied successfully.");
  } catch (e: any) {
    console.error("Migration failed:", e.message);
  }
  process.exit(0);
}
run();
