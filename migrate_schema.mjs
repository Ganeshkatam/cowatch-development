import pg from 'pg';
import { loadEnvFile } from "node:process";
import fs from "node:fs";

if (fs.existsSync(".env")) {
  loadEnvFile();
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await pool.query(`ALTER TABLE rooms ADD COLUMN "scheduledStartsAt" timestamp with time zone NULL;`);
    console.log("Migration successful.");
  } catch (err) {
    if (err.code === '42701') { // column already exists
      console.log("Column scheduledStartsAt already exists.");
    } else {
      console.error(err);
      process.exit(1);
    }
  }
  process.exit(0);
}
run();
