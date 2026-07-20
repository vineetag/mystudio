import "server-only"

import { createClient, createServiceClient } from "@/lib/db"
import { isPromptKey, type PromptKey, type PromptTemplate } from "./types"

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToTemplate(row: any): PromptTemplate | null {
  if (!isPromptKey(row.key)) return null
  return {
    key: row.key,
    label: row.label,
    description: row.description ?? "",
    systemPrompt: row.system_prompt,
    userTemplate: row.user_template,
    updatedAt: row.updated_at,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const COLUMNS = "key, label, description, system_prompt, user_template, updated_at"

/**
 * All prompt templates. Readable by anon too — demo mode shows the same
 * templates a live run would use, so what you see is what it would do.
 */
export async function listPromptTemplates(): Promise<PromptTemplate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("pt_ai_prompts").select(COLUMNS)

  if (error) {
    throw new Error(`Could not load prompt templates: ${error.message}`)
  }
  return (data ?? [])
    .map(rowToTemplate)
    .filter((template): template is PromptTemplate => template !== null)
}

export async function getPromptTemplate(key: PromptKey): Promise<PromptTemplate> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pt_ai_prompts")
    .select(COLUMNS)
    .eq("key", key)
    .maybeSingle()

  if (error) {
    throw new Error(`Could not load the "${key}" prompt template: ${error.message}`)
  }
  const template = data ? rowToTemplate(data) : null
  if (!template) {
    throw new Error(
      `The "${key}" prompt template is missing. Re-run migration 0009 to restore the defaults.`,
    )
  }
  return template
}

/**
 * Owner-only template edit. Callers must have passed `requireOwner()` first —
 * this uses the service role because pt_ai_prompts has no write policy.
 */
export async function savePromptTemplate(
  key: PromptKey,
  fields: { systemPrompt: string; userTemplate: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("pt_ai_prompts")
    .update({
      system_prompt: fields.systemPrompt,
      user_template: fields.userTemplate,
    })
    .eq("key", key)

  if (error) {
    return { ok: false, error: `Could not save the template: ${error.message}` }
  }
  return { ok: true }
}
