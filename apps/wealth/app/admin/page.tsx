import Link from "next/link"
import { getBudget, listPromptTemplates } from "@/modules/ai"
import { getViewer } from "@/modules/auth"
import { BudgetForm } from "@/components/admin/budget-form"
import { PromptEditor } from "@/components/admin/prompt-editor"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const viewer = await getViewer()

  // Owner-only. The owner previewing demo mode also hits this gate, because
  // every control below writes to live data.
  if (!viewer.isOwner || viewer.mode !== "live") {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-12">
        <h1 className="text-2xl font-semibold text-ink">Admin</h1>
        <p className="text-sm text-ink/70">
          This area is restricted to the signed-in owner in live mode.
        </p>
        <Link
          href="/login"
          className="inline-flex min-h-12 items-center text-sm text-ink underline underline-offset-2 hover:no-underline"
        >
          Owner sign-in
        </Link>
      </main>
    )
  }

  const [budget, prompts] = await Promise.all([getBudget(), listPromptTemplates()])

  const order = ["portfolio", "stock", "research"]
  const sorted = [...prompts].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Admin</h1>
        <p className="text-sm text-ink/60">
          AI spend controls and the prompt templates behind{" "}
          <Link href="/analysis" className="underline underline-offset-2">
            AI analysis
          </Link>
          .
        </p>
      </header>

      <BudgetForm budget={budget} />

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink">AI prompts</h2>
          <p className="text-sm text-ink/60">
            Edits take effect on the next run — no deploy needed.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {sorted.map((template) => (
            <PromptEditor key={template.key} template={template} />
          ))}
        </div>
      </section>
    </main>
  )
}
