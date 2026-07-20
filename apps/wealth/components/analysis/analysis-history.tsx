import type { Analysis } from "@/modules/ai"
import { formatAsOf } from "@/lib/format"
import { AnalysisMarkdown } from "./analysis-markdown"

/**
 * Past runs, newest first. Collapsed by default — the point of the list is the
 * cost ledger, and the text is there when you want to re-read one without
 * paying for it again.
 */
export function AnalysisHistory({ analyses }: { analyses: Analysis[] }) {
  if (analyses.length === 0) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">Past analyses</h2>
        <p className="text-sm text-ink/60">
          Nothing yet. Runs you make show up here with what each one cost.
        </p>
      </section>
    )
  }

  const total = analyses.reduce((sum, analysis) => sum + analysis.costUsd, 0)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Past analyses</h2>
        <span className="text-xs text-ink/60">
          Last {analyses.length} runs · ${total.toFixed(4)} total
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {analyses.map((analysis) => (
          <li key={analysis.id}>
            <details className="rounded-lg border border-rule">
              <summary className="flex min-h-12 cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="font-medium text-ink">
                  {analysis.targetType === "portfolio" ? "Whole portfolio" : analysis.target}
                </span>
                <span className="text-xs tabular-nums text-ink/60">
                  {formatAsOf(analysis.createdAt)} · {analysis.model} · $
                  {analysis.costUsd.toFixed(4)}
                </span>
              </summary>
              <div className="border-t border-rule px-4 py-4">
                <AnalysisMarkdown content={analysis.content} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  )
}
