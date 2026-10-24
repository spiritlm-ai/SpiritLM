import { IMAGES } from "@/configs/paths/images.paths";

export const AGENTS = [
  { name: "Claude Code", image: IMAGES.AGENTS.CLAUDE_CODE },
  { name: "Codex", image: IMAGES.AGENTS.CODEX },
  { name: "Cursor", image: IMAGES.AGENTS.CURSOR, invert: true },
  { name: "Hermes", image: IMAGES.AGENTS.HERMES, invert: true },
  { name: "Kimi Code", image: IMAGES.AGENTS.KIMI_CODE },
  { name: "OpenCode", image: IMAGES.AGENTS.OPEN_CODE, invert: true },
  { name: "VS Code", image: IMAGES.AGENTS.VS_CODE },
] as const;
