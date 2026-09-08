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
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'rooms';
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
run();
