export type SpiritCodeModelCapabilities = {
  toolCalling: boolean | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
};

export type SpiritCodeAccount = {
  id: string;
  clerkId: string;
  createdAt: string;
  balance: string;
};
