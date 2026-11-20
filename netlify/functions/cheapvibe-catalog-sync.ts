import { ApiError } from "../../src/lib/api-error";
import { syncCheapVibeCatalog } from "../../src/lib/cheapvibe-catalog-sync";
import { db } from "../../src/lib/db";

export default async function cheapVibeCatalogSync() {
  try {
    const { modelCount, updated } = await syncCheapVibeCatalog();
    console.info(`CheapVibeCode catalog: ${modelCount} models, saved: ${updated}.`);
    return new Response(null, { status: 204 });
  } catch (error) {
    const code = error instanceof ApiError ? error.code : "internal_error";
    throw new Error(`CheapVibeCode catalog sync failed (${code}).`);
  } finally {
    await db.$disconnect();
  }
}
