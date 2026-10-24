import {
  SPIRITCODE_MODEL_CAPABILITIES,
  SPIRITCODE_SAMPLE_PRICES,
} from "@/configs/consts/spiritcode.const";
import { authenticateApiKey } from "@/lib/api-keys";
import { errorResponse } from "@/lib/api-error";
import { availableModels } from "@/lib/model-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await authenticateApiKey(request);
    const models = await availableModels();
    return Response.json({
      object: "list",
      data: models.map((model) => {
        const capabilities = SPIRITCODE_MODEL_CAPABILITIES[model.id];
        return {
          id: model.id,
          tool_calling: capabilities?.toolCalling ?? null,
          context_window: capabilities?.contextWindow ?? null,
          max_output_tokens: capabilities?.maxOutputTokens ?? model.maxOutputTokens ?? null,
          price_per_million_tokens: model.price.toFixed(8),
          currency: "RUB",
          sample_price: SPIRITCODE_SAMPLE_PRICES,
          subscription_limits: null,
        };
      }),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
