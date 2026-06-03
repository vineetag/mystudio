// Client-safe theme metadata. Mirrors the THEMES union in lib/ai.ts (which is
// server-only and can't be imported into client components). The keys MUST stay
// in sync with the DB `theme` check constraint and the Tailwind theme tokens.

export const THEME_OPTIONS = [
  { key: "adventure", label: "Adventure", emoji: "🗺️" },
  { key: "animals", label: "Animals", emoji: "🦊" },
  { key: "space", label: "Space", emoji: "🚀" },
  { key: "fantasy", label: "Fantasy", emoji: "🧚" },
] as const

export type ThemeKey = (typeof THEME_OPTIONS)[number]["key"]
