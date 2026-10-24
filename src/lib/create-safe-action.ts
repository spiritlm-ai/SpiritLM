import { z } from "zod";
import { ApiError } from "./api-error";
import type { ActionState, FieldsErrors } from "@/configs/types/actions.types";

export function createSafeAction<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  handler: (data: TInput) => Promise<ActionState<TInput, TOutput>>,
) {
  return async (data: TInput): Promise<ActionState<TInput, TOutput>> => {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return {
        fieldErrors: z.flattenError(parsed.error)
          .fieldErrors as FieldsErrors<TInput>,
        error: "Некорректные параметры",
        status: 400,
        code: "invalid_parameters",
      };
    }
    try {
      return await handler(parsed.data);
    } catch (error) {
      if (error instanceof ApiError) {
        return { error: error.message, status: error.status, code: error.code };
      }
      return {
        error: "Сервис временно недоступен",
        status: 500,
        code: "internal_error",
      };
    }
  };
}

export function unwrapAction<TInput, TOutput>(
  state: ActionState<TInput, TOutput>,
): TOutput {
  if (state.error || state.fieldErrors) {
    throw new ApiError(
      state.status ?? 400,
      state.code ?? "invalid_parameters",
      state.error ?? "Некорректные параметры",
    );
  }
  if (!("data" in state))
    throw new ApiError(500, "internal_error", "Сервис временно недоступен");
  return state.data as TOutput;
}
