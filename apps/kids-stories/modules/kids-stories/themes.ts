// Client-safe theme metadata. Mirrors the THEMES union in lib/ai.ts (server-only).
// Keys MUST stay in sync with the DB theme array values and Tailwind theme tokens.

export const THEME_OPTIONS = [
  { key: "kindness",   label: "Kindness & Empathy",   emoji: "💛" },
  { key: "honesty",    label: "Honesty & Trust",       emoji: "⭐" },
  { key: "courage",    label: "Courage & Bravery",     emoji: "🦁" },
  { key: "family",     label: "Family & Love",         emoji: "❤️" },
  { key: "friendship", label: "Friendship & Loyalty",  emoji: "🤝" },
  { key: "challenges", label: "Overcoming Challenges", emoji: "🌱" },
  { key: "wonder",     label: "Wonder & Magic",        emoji: "✨" },
  { key: "nature",     label: "Nature & Animals",      emoji: "🌿" },
  { key: "growth",     label: "Growth & Milestone",    emoji: "🌻" },
] as const

export type ThemeKey = (typeof THEME_OPTIONS)[number]["key"]

// Grouped for the theme picker UI. Slices reference THEME_OPTIONS so keys are
// never duplicated.
export const THEME_CATEGORIES = [
  { label: "Core Moral & Behavioral", themes: THEME_OPTIONS.slice(0, 3) },
  { label: "Social & Emotional",      themes: THEME_OPTIONS.slice(3, 6) },
  { label: "Imagination & Exploration", themes: THEME_OPTIONS.slice(6, 9) },
] as const
