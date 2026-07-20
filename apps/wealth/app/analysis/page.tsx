import { listViewerAccountsWithHoldings } from "@/modules/accounts"
import { getBudget, listAnalyses, listPromptTemplates, RATE_LIMIT_PER_HOUR, countRecentRuns } from "@/modules/ai"
import { getViewer } from "@/modules/auth"
import { AnalysisRunner } from "@/components/analysis/analysis-runner"
import { AnalysisHistory } from "@/components/analysis/analysis-history"

export const dynamic = "force-dynamic"

export default async function AnalysisPage() {
  const viewer = await getViewer()
  const isLive = viewer.mode === "live" && !!viewer.user

  // Demo viewers get templates + holdings only: no budget read, no history read,
  // no API call anywhere in this page (spec guardrail 4).
  const [prompts, accounts, budget, recentRuns, history] = await Promise.all([
    listPromptTemplates(),
    listViewerAccountsWithHoldings(),
    isLive ? getBudget() : Promise.resolve(null),
    isLive ? countRecentRuns(viewer.user!.id) : Promise.resolve(null),
    isLive ? listAnalyses(viewer.user!.id) : Promise.resolve([]),
  ])

  const heldSymbols = [
    ...new Set(
      accounts
        .filter((account) => !account.hidden)
        .flatMap((account) => account.holdings.map((holding) => holding.symbol)),
    ),
  ].sort()

  // Stable order regardless of how Postgres returns them.
  const order = ["portfolio", "stock", "research"]
  const options = [...prompts]
    .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
    .map((prompt) => ({
      key: prompt.key,
      label: prompt.label,
      description: prompt.description,
    }))

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">AI analysis</h1>
        <p className="text-sm text-ink/60">
          Every run shows its cost before it starts and counts against a hard monthly
          cap. Prompts are editable in Admin.
        </p>
      </header>

      <AnalysisRunner
        prompts={options}
        isOwner={isLive}
        budget={budget}
        runsRemaining={
          recentRuns === null ? null : Math.max(0, RATE_LIMIT_PER_HOUR - recentRuns)
        }
        heldSymbols={heldSymbols}
      />

      {isLive ? <AnalysisHistory analyses={history} /> : null}
    </main>
  )
}
