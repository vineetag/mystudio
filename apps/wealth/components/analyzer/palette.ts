// Categorical palette for the analyzer charts — a fixed hue order, assigned by
// slot and never cycled. Slots 1, 2 and 6 are the same hues the portfolio chart
// already uses, so a series keeps one identity across the app.
//
// Validated as a set against the paper surface (#F7F8F6): worst adjacent CVD
// ΔE 9.1 (OKLab ×100, ≥8 target), worst adjacent normal-vision ΔE 19.6 (≥15
// floor). Magenta, yellow and aqua fall under 3:1 contrast on paper, so every
// chart using them ships visible labels or a value table — never color alone.
// Re-run the validator before reordering or substituting a hue.

import { OTHER } from "@/modules/analyzer"

export const SERIES_COLORS = [
  "#2a78d6", // blue
  "#008300", // green
  "#e87ba4", // magenta
  "#eda100", // yellow
  "#1baf7a", // aqua
  "#eb6834", // orange
  "#4a3aa7", // violet
  "#e34948", // red
] as const

/** Neutral for the folded "Other" bucket — never one of the identity hues. */
export const OTHER_COLOR = "#8a8f88"

/**
 * Color for series `index`. Past the eighth slot the caller should have folded
 * the tail into "Other" already; the modulo is a render-time backstop, not a
 * license to cycle hues.
 */
export function seriesColor(index: number, label?: string): string {
  if (label === OTHER) return OTHER_COLOR
  return SERIES_COLORS[index % SERIES_COLORS.length]
}
