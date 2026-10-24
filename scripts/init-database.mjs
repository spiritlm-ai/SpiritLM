import "./load-env.mjs";
import mariadb from "mariadb";
import { randomBytes } from "node:crypto";
import { readFile, writeFile, chmod } from "node:fs/promises";

// Supply the administrator URL only to this process, never to the deployed app.
const adminUrl = process.env.DATABASE_ADMIN_URL;
if (!adminUrl) throw new Error("Set DATABASE_ADMIN_URL for this command");
const target = new URL(adminUrl);
const database = "spiritlm";
const username = `spiritlm_${randomBytes(4).toString("hex")}`;
const password = randomBytes(32).toString("hex");
let connection;
try {
  if (process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL already exists; use db:migrate instead of initialization");
  }
  connection = await mariadb.createConnection({
    host: target.hostname,
    port: Number(target.port || 3306),
    user: decodeURIComponent(target.username),
    password: decodeURIComponent(target.password),
    connectTimeout: 15_000,
    ssl: process.env.DATABASE_REQUIRE_TLS === "true" ? { rejectUnauthorized: true } : undefined,
  });
  await connection.query("CREATE DATABASE IF NOT EXISTS `spiritlm` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  const existing = await connection.query("SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = ?", [database]);
  if (Number(existing[0].count) > 0) throw new Error("Database spiritlm is not empty; refusing initialization");
  // The generated identifiers contain only ASCII letters, digits and underscores.
  await connection.query(`CREATE USER '${username}'@'%' IDENTIFIED BY '${password}'`);
  await connection.query(`GRANT ALL PRIVILEGES ON spiritlm.* TO '${username}'@'%'`);
  const appUrl = new URL(adminUrl);
  appUrl.username = username;
  appUrl.password = password;
  appUrl.pathname = `/${database}`;
  appUrl.search = "?connection_limit=3&connect_timeout=15&pool_timeout=15";
  if (process.env.DATABASE_REQUIRE_TLS === "true") appUrl.searchParams.set("sslaccept", "strict");
  let contents = await readFile(".env.local", "utf8").catch(() => "");
  contents += `\nDATABASE_URL=${JSON.stringify(appUrl.toString())}\n`;
  await writeFile(".env.local", contents, { mode: 0o600 });
  await chmod(".env.local", 0o600);
  console.log("Created isolated spiritlm database and application account; DATABASE_URL saved to .env.local.");
} catch (error) {
  // MariaDB errors can embed SQL containing generated credentials.
  console.error("Database initialization failed:", error?.code ?? (error instanceof Error && !connection ? error.message : "check database permissions/connectivity"));
  process.exitCode = 1;
} finally {
  await connection?.end();
}
