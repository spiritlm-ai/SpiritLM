import { ICON_COMPONENTS } from "@/configs/consts/icons.const";
import type { IconProps } from "@/configs/types/icons.types";

export function Icon({ name, size = 17 }: IconProps) {
  const TablerIcon = ICON_COMPONENTS[name];

  return <TablerIcon size={size} stroke={1.7} aria-hidden="true" />;
}
