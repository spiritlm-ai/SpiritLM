import type { ICON_COMPONENTS } from "@/configs/consts/icons.const";

export type IconProps = { name: keyof typeof ICON_COMPONENTS; size?: number };
