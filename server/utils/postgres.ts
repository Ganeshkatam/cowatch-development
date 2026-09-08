import { Pool, type PoolClient, type QueryResult } from "pg";
import fs from "node:fs";
import config from "../config.ts";

export type PostgresClient = Pool | PoolClient;

export let postgres: Pool | undefined = undefined;
if (config.DATABASE_URL) {
  postgres = createPool(config.DATABASE_URL);
}

export function normalizePostgresConnectionString(connStr: string): string {
  if (!connStr) return connStr;
  const match = connStr.match(
    /^postgres(?:ql)?:\/\/postgres(?::([^@]*))?@db\.([a-z0-9]+)\.supabase\.co(?::\d+)?\/(.*)$/i,
  );
  if (match) {
    const password = match[1] || "";
    const projectRef = match[2];
    const rest = match[3] || "postgres";
    const region =
      process.env.SUPABASE_REGION ||
      (projectRef === "mbnuunibouzwteoeuyfh"
        ? "ap-south-1"
        : projectRef === "ymsgibplkzuxicwfhefw"
          ? "ap-south-1"
          : "");
    if (region) {
      const cleanRest = rest.split("?")[0];
      const auth = password ? `postgres.${projectRef}:${password}` : `postgres.${projectRef}`;
      const poolerUrl = `postgresql://${auth}@aws-0-${region}.pooler.supabase.com:5432/${cleanRest}`;
      console.log(
        `[PostgreSQL] Direct Supabase host detected. Automatically routed through IPv4 pooler: aws-0-${region}.pooler.supabase.com:5432`,
      );
      return poolerUrl;
    }
  }
  return connStr;
}

function createPool(rawConnectionString: string): Pool {
  const connectionString = normalizePostgresConnectionString(rawConnectionString);
  const strict = String(config.DATABASE_SSL_STRICT || "false").toLowerCase() === "true";
  const caPath = String(config.DATABASE_SSL_CA || "").trim();
  let ca: string | undefined;

  if (caPath) {
    try {
      ca = fs.readFileSync(caPath, "utf8");
    } catch (error) {
      throw new Error(`Unable to read DATABASE_SSL_CA: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!strict && !ca) {
    console.log("[PostgreSQL] TLS certificate verification is disabled. Set DATABASE_SSL_STRICT=true for production.");
  }

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: strict || Boolean(ca),
      ...(ca ? { ca } : {}),
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("error", (err) => {
    console.error("PostgreSQL pool idle client error:", err.message);
  });

  return pool;
}

export function newPostgres(): Pool {
  if (!config.DATABASE_URL) throw new Error("postgres not configured");
  return postgres || createPool(config.DATABASE_URL);
}

export async function updateObject(
  postgres: PostgresClient,
  table: string,
  object: AnyDict,
  condition: AnyDict,
): Promise<QueryResult<any>> {
  const columns = Object.keys(object);
  const values = Object.values(object);
  let query = `UPDATE ${table} SET ${columns.map((c, i) => `"${c}" = $${i + 1}`).join(",")}
    WHERE "${Object.keys(condition)[0]}" = $${Object.keys(object).length + 1}
    RETURNING *`;
  const result = await postgres.query(query, [...values, condition[Object.keys(condition)[0]]]);
  return result;
}

export async function insertObject(
  postgres: PostgresClient,
  table: string,
  object: AnyDict,
): Promise<QueryResult<any>> {
  const columns = Object.keys(object);
  const values = Object.values(object);
  let query = `INSERT INTO ${table} (${columns.map((c) => `"${c}"`).join(",")})
    VALUES (${values.map((_, i) => "$" + (i + 1)).join(",")})
    RETURNING *`;
  const result = await postgres.query(query, values);
  return result;
}

export async function upsertObject(
  postgres: PostgresClient,
  table: string,
  object: AnyDict,
  conflict: BooleanDict,
): Promise<QueryResult<any>> {
  const columns = Object.keys(object);
  const values = Object.values(object);
  let query = `INSERT INTO ${table} (${columns.map((c) => `"${c}"`).join(",")})
    VALUES (${values.map((_, i) => "$" + (i + 1)).join(",")})
    ON CONFLICT (${Object.keys(conflict).map((k) => `"${k}"`).join(",")})
    DO UPDATE SET ${Object.keys(object).map((c) => `"${c}" = EXCLUDED."${c}"`).join(",")}
    RETURNING *`;
  const result = await postgres.query(query, values);
  return result;
}
