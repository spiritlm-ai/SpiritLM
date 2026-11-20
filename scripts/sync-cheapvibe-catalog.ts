import "./load-env.mjs";
import { ApiError } from "../src/lib/api-error";
import { db } from "../src/lib/db";
import { syncCheapVibeCatalog } from "../src/lib/cheapvibe-catalog-sync";

async function main() {
  try {
    const { modelCount, updated } = await syncCheapVibeCatalog();
    console.info(`CheapVibeCode catalog: ${modelCount} models, saved: ${updated}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  const code = error instanceof ApiError ? error.code : "internal_error";
  console.error(`CheapVibeCode catalog sync failed (${code}).`);
  process.exitCode = 1;
});
