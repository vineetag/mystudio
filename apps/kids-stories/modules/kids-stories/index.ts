// Public surface of the kids-stories module. Import from here, never reach
// directly into ./components (per monorepo module-boundary rule).
export { StoryGenerator } from "./components/story-generator"
export { ThemePicker } from "./components/theme-picker"
export { StoryCard, type StoryCardData } from "./components/story-card"
export { THEME_OPTIONS, type ThemeKey } from "./themes"
