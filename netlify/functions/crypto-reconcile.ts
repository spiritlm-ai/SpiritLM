import { cryptoBotConfig } from "../../src/lib/crypto-pay";
import { http } from "../../src/lib/http-client";
import { createCryptoReconcileTriggerToken } from "../../src/lib/crypto-reconcile-auth";

type NetlifyFunctionContext = {
  site: {
    url: string;
  };
};

export default async function cryptoReconcile(_request: Request, context: NetlifyFunctionContext) {
  const config = cryptoBotConfig();
  const response = await http.post(
    new URL("/.netlify/functions/crypto-reconcile-background", context.site.url),
    {
      headers: {
        "x-spiritlm-reconcile": createCryptoReconcileTriggerToken(config.token),
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error("CryptoBot reconciliation could not be started.");
  }
}
