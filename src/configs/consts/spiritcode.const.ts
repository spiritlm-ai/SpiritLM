import type { SpiritCodeModelCapabilities } from "../types/spiritcode.types";

export const SPIRITCODE_INSTALL_COMMAND = "pip install spiritcode";

// Fill only after verifying capabilities against the SpiritLM upstream deployment.
// Unknown capabilities must stay null; model names alone are not evidence.
export const SPIRITCODE_MODEL_CAPABILITIES: Readonly<
  Record<string, SpiritCodeModelCapabilities>
> = {};

// Prices remain labelled as samples until product approval for the CLI contract.
export const SPIRITCODE_SAMPLE_PRICES = true;
