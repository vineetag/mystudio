"use client"

import { useState, useTransition } from "react"
import { savePromptAction } from "@/modules/ai/actions"
import { templateVars } from "@/modules/ai/template"
import type { PromptTemplate } from "@/modules/ai/types"

const textareaClass =
  "w-full rounded-md border border-rule p-3 font-mono text-sm leading-relaxed outline-none focus:border-moss"

/**
 * Editable prompt template. Wording lives in the database so it can change
 * without a deploy; the guardrails that keep spend and behavior sane live in
 * code and are not editable here.
 */
export function PromptEditor({ template }: { template: PromptTemplate }) {
  const [systemPrompt, setSystemPrompt] = useState(template.systemPrompt)
  const [userTemplate, setUserTemplate] = useState(template.userTemplate)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const dirty =
    systemPrompt !== template.systemPrompt || userTemplate !== template.userTemplate
  const vars = templateVars(userTemplate)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSaved(false)
    startTransition(async () => {
      const result = await savePromptAction(template.key, systemPrompt, userTemplate)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSaved(true)
    })
  }

  return (
    <details className="rounded-lg border border-rule">
      <summary className="flex min-h-12 cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3">
        <span className="font-medium text-ink">{template.label}</span>
        <span className="text-xs text-ink/60">{template.description}</span>
      </summary>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-rule p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink">System prompt</span>
          <span className="text-xs text-ink/60">
            Sets the model&rsquo;s role and rules. Cannot be empty — it is what keeps the
            model from inventing figures.
          </span>
          <textarea
            value={systemPrompt}
            onChange={(event) => {
              setSystemPrompt(event.target.value)
              setSaved(false)
            }}
            rows={14}
            className={textareaClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink">Message template</span>
          <span className="text-xs text-ink/60">
            Must include <code>{"{{context}}"}</code> — that is where the portfolio data
            is injected. <code>{"{{symbol}}"}</code> is available on the holding and
            research prompts.
          </span>
          <textarea
            value={userTemplate}
            onChange={(event) => {
              setUserTemplate(event.target.value)
              setSaved(false)
            }}
            rows={6}
            className={textareaClass}
          />
          <span className="text-xs text-ink/60">
            Placeholders used: {vars.length > 0 ? vars.join(", ") : "none"}
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending || !dirty}
            className="min-h-12 rounded-md bg-ink px-5 text-sm font-medium text-white disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save template"}
          </button>
          {dirty ? <span className="text-xs text-ink/60">Unsaved changes</span> : null}
          {saved ? <span className="text-sm text-moss">Template saved.</span> : null}
        </div>

        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </details>
  )
}
