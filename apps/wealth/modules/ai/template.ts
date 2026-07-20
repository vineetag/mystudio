// {{placeholder}} rendering for prompt templates. Pure — unit-tested.

/** Placeholders a template may reference. Anything else is a template bug. */
export const TEMPLATE_VARS = ["symbol", "context"] as const

export type TemplateVar = (typeof TEMPLATE_VARS)[number]

const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/g

/**
 * Substitutes {{vars}} in an owner-edited template.
 *
 * Unknown placeholders are left verbatim rather than blanked: the templates are
 * editable from /admin, and a silently-emptied placeholder would ship a subtly
 * broken prompt to the model with no signal. A visible `{{typo}}` in the output
 * points straight at the edit that caused it.
 */
export function renderTemplate(
  template: string,
  vars: Partial<Record<TemplateVar, string>>,
): string {
  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = vars[name as TemplateVar]
    return value === undefined ? match : value
  })
}

/** Placeholder names a template uses — powers the /admin editor's hints. */
export function templateVars(template: string): string[] {
  const found = new Set<string>()
  for (const match of template.matchAll(PLACEHOLDER)) found.add(match[1])
  return [...found].sort()
}
