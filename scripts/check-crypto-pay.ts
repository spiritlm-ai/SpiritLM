import "./load-env.mjs";
import { z } from "zod";
import { cryptoBotConfig, cryptoPayRequest } from "../src/lib/crypto-pay";

async function main() {
  const config = cryptoBotConfig();
  const app = await cryptoPayRequest(config, "getMe", {}, z.object({
    app_id: z.number().int().positive().safe(),
  }));
  if (String(app.app_id) !== config.appId) {
    throw new Error("Crypto Pay application identity does not match the token prefix");
  }
  console.log(`CryptoBot ${config.mode}: authentication successful`);
}

main().catch(() => {
  console.error("CryptoBot authentication check failed. Check the selected mode and its token.");
  process.exitCode = 1;
});
