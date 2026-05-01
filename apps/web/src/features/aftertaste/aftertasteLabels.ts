import type { AftertasteAppetiteEffect } from "@canonos/contracts";

export const appetiteEffectLabels: Record<AftertasteAppetiteEffect, string> = {
  more_like_this: "More like this",
  less_like_this: "Less like this",
  only_in_mood: "Only in the right mood",
  no_change: "No change",
};

export function booleanLabel(value: boolean): string {
  return value ? "Yes" : "No";
}
