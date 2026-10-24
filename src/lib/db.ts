import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

function createClient() {
  const url = new URL(process.env.DATABASE_URL ?? "mysql://unused:unused@localhost:3306/spiritlm");
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: 3,
    connectTimeout: 15_000,
    acquireTimeout: 15_000,
    timezone: "+00:00",
    ssl: url.searchParams.get("sslaccept") === "strict"
      ? { rejectUnauthorized: true }
      : undefined,
  });
  return new PrismaClient({ adapter, log: [] });
}

// Regeneration can change fields while Next.js retains the previous client in memory.
const schemaVersion = JSON.stringify(Prisma.dmmf.datamodel);
export const db = globalForPrisma.prismaSchemaVersion === schemaVersion
  ? globalForPrisma.prisma ?? createClient()
  : createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaSchemaVersion = schemaVersion;
}
