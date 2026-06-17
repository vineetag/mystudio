// Public surface of the story-safety agent. Import from here, never reach
// directly into ./agent or ./policy (per monorepo module-boundary rule).
export { screenStory, UNSAFE_STORY_MESSAGE } from "./agent"
export type { ScreenInput, ScreenResult } from "./agent"
export {
  decideAction,
  BLOCK_AT_LEVEL,
  SAFETY_CATEGORIES,
} from "./policy"
export type {
  SafetyAction,
  SafetyCategory,
  SafetyVerdict,
  CategoryScore,
  SeverityLevel,
} from "./policy"
