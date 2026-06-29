/** Toggle screening off entirely (e.g. to save cost in local development). */
export function isSafetyEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (env.STORY_SAFETY_ENABLED === "false") return false
  if (env.STORY_SAFETY_ENABLED === "true") return true

  return env.NODE_ENV !== "development"
}
