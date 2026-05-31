// Loads the Turso/libSQL database from db/schema.sql then db/seed.sql.
// Reads credentials from .dev.vars (gitignored) — no turso CLI required.
//   node scripts/db-setup.mjs
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Parse `KEY = "value"` (or KEY=value) lines from .dev.vars
function parseDevVars(path) {
  const out = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = parseDevVars(join(root, ".dev.vars"));
const url = env.TURSO_DATABASE_URL;
const authToken = env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .dev.vars");
  process.exit(1);
}

const client = createClient({ url, authToken });

// Optional one-time reset: drop every existing table so an incompatible
// older schema can't block CREATE TABLE IF NOT EXISTS. Opt-in only.
if (process.argv.includes("--reset")) {
  const existing = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
  );
  const names = existing.rows.map((r) => r.name);
  if (names.length) {
    console.log(`Resetting: dropping ${names.length} table(s): ${names.join(", ")}`);
    const drop =
      "PRAGMA foreign_keys = OFF;\n" +
      names.map((n) => `DROP TABLE IF EXISTS "${n}";`).join("\n");
    await client.executeMultiple(drop);
  } else {
    console.log("Reset requested: no existing tables to drop.");
  }
}

const schema = readFileSync(join(root, "db", "schema.sql"), "utf8");
const seed = readFileSync(join(root, "db", "seed.sql"), "utf8");

console.log("Applying schema.sql ...");
await client.executeMultiple(schema);
console.log("Applying seed.sql ...");
// The seed intentionally omits some referenced rows (e.g. specialties),
// so load it with FK enforcement off — SQLite/Turso's default.
await client.executeMultiple("PRAGMA foreign_keys = OFF;\n" + seed);

const res = await client.execute("SELECT COUNT(*) AS n FROM packages");
console.log(`packages row count: ${res.rows[0].n}`);

client.close();
