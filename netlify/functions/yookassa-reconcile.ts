import { yooKassaConfig } from "../../src/lib/yookassa";
import { http } from "../../src/lib/http-client";
import { createYooKassaReconcileTriggerToken } from "../../src/lib/yookassa-reconcile-auth";

type NetlifyFunctionContext = {
  site: {
    url: string;
  };
};

export default async function yooKassaReconcile(
  _request: Request,
  context: NetlifyFunctionContext,
) {
  if (process.env.YOOKASSA_MODE !== "test") return;
  const config = yooKassaConfig();
  const response = await http.post(
    new URL("/.netlify/functions/yookassa-reconcile-background", context.site.url),
    {
      headers: {
        "x-spiritlm-reconcile": createYooKassaReconcileTriggerToken(config.secretKey),
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error("YooKassa reconciliation could not be started.");
  }
}
