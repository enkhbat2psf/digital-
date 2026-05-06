import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createConnection } from "mysql2/promise";

type MigrationRow = { hash: string };

function splitSqlStatements(sql: string): string[] {
  // Good enough for our simple drizzle migrations (no custom delimiters).
  return sql
    .split(/;\s*\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function ensureMigrationsTable(conn: Awaited<ReturnType<typeof createConnection>>) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id int AUTO_INCREMENT NOT NULL,
      hash text NOT NULL,
      created_at bigint NOT NULL,
      PRIMARY KEY (id)
    );
  `);
}

async function getAppliedHashes(
  conn: Awaited<ReturnType<typeof createConnection>>,
): Promise<Set<string>> {
  await ensureMigrationsTable(conn);
  const [rows] = await conn.query("SELECT hash FROM __drizzle_migrations");
  const hashes = new Set<string>();
  for (const r of rows as MigrationRow[]) {
    if (r?.hash) hashes.add(r.hash);
  }
  return hashes;
}

async function listMigrationFiles(drizzleDir: string): Promise<string[]> {
  const entries = await fs.readdir(drizzleDir);
  return entries
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort((a, b) => a.localeCompare(b));
}

export async function autoMigrateIfNeeded(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;

  // In production the app runs from `dist/`, so `import.meta.dirname` would resolve
  // to `digital-gallery-web/dist` and break relative paths. Use cwd as the project root.
  const drizzleDir = path.resolve(process.cwd(), "drizzle");
  let conn: Awaited<ReturnType<typeof createConnection>> | null = null;

  try {
    conn = await createConnection(databaseUrl);
    const applied = await getAppliedHashes(conn);

    const files = await listMigrationFiles(drizzleDir);
    if (files.length === 0) return;

    for (const file of files) {
      const filePath = path.join(drizzleDir, file);
      const buf = await fs.readFile(filePath);
      const hash = crypto.createHash("sha256").update(buf).digest("hex");
      if (applied.has(hash)) continue;

      const sql = buf.toString("utf8");
      const statements = splitSqlStatements(sql);
      for (const stmt of statements) {
        await conn.query(stmt);
      }
      await conn.query("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)", [
        hash,
        Date.now(),
      ]);
      applied.add(hash);
      console.log(`[DB] Applied migration ${file}`);
    }
  } catch (e) {
    console.warn("[DB] Auto-migrate failed:", e);
  } finally {
    try {
      await conn?.end();
    } catch {
      // ignore
    }
  }
}

