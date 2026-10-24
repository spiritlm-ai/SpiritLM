import type { z } from "zod";
import type { yooKassaPaymentSchema } from "@/configs/schemas/yookassa.schema";

export type YooKassaPaymentObject = z.infer<typeof yooKassaPaymentSchema>;
export type YooKassaConfig = {
  mode: "test";
  shopId: string;
  secretKey: string;
};
