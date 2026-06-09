import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient, createServiceClient } from "@/lib/db"
import { THEME_OPTIONS } from "@/modules/kids-stories"

export const metadata: Metadata = { title: "Admin · ZippyTales" }
// Always render fresh stats; never cache.
export const dynamic = "force-dynamic"

const MONTHLY_BUDGET_USD = Number(process.env.ANTHROPIC_MONTHLY_BUDGET_USD ?? "20")

function isAdmin(email: string | undefined): boolean {
  if (!email) return false
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return allow.includes(email.toLowerCase())
}

export default async function AdminPage() {
  // 1. Auth + admin gate. Middleware already requires login; non-admins get 404
  // (so the route's existence isn't revealed).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?redirectTo=/admin")
  if (!isAdmin(user.email)) notFound()

  // 2. Global stats via the service client (bypasses RLS — admin needs an
  // all-users view). Safe: we only get here after the admin check above.
  const db = createServiceClient()
  const now = new Date()
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString()
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString()

  const countHead = { count: "exact" as const, head: true }

  const [
    totalStories,
    monthStories,
    todayStories,
    totalUsers,
    recent,
    usage,
    ...themeCounts
  ] = await Promise.all([
    db.from("stories").select("*", countHead),
    db.from("stories").select("*", countHead).gte("created_at", monthStart),
    db.from("stories").select("*", countHead).gte("created_at", dayStart),
    db.from("profiles").select("*", countHead),
    db
      .from("stories")
      .select("id, title, child_name, theme, illustration, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    db
      .from("ai_usage")
      .select("cost_usd, input_tokens, output_tokens")
      .gte("created_at", monthStart),
    ...THEME_OPTIONS.map((t) =>
      db.from("stories").select("*", countHead).eq("theme", t.key),
    ),
  ])

  const usageRows =
    (usage.data as
      | { cost_usd: number; input_tokens: number; output_tokens: number }[]
      | null) ?? []
  const spend = usageRows.reduce((s, r) => s + Number(r.cost_usd), 0)
  const calls = usageRows.length
  const inputTokens = usageRows.reduce((s, r) => s + (r.input_tokens ?? 0), 0)
  const outputTokens = usageRows.reduce((s, r) => s + (r.output_tokens ?? 0), 0)
  const spendPct = Math.min(100, (spend / MONTHLY_BUDGET_USD) * 100)

  const recentStories =
    (recent.data as
      | {
          id: string
          title: string
          child_name: string
          theme: string
          illustration: string | null
          created_at: string
        }[]
      | null) ?? []

  const stats: { label: string; value: string | number }[] = [
    { label: "Total stories", value: totalStories.count ?? 0 },
    { label: "Stories this month", value: monthStories.count ?? 0 },
    { label: "Stories today", value: todayStories.count ?? 0 },
    { label: "Registered users", value: totalUsers.count ?? 0 },
    { label: "AI calls (month)", value: calls },
    {
      label: "Tokens (month)",
      value: `${(inputTokens / 1000).toFixed(1)}k in · ${(outputTokens / 1000).toFixed(1)}k out`,
    },
  ]

  const themeMax = Math.max(1, ...themeCounts.map((c) => c?.count ?? 0))

  return (
    <main className="min-h-[calc(100dvh-4rem)] px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            Admin
          </h1>
          <span className="text-sm text-ink-muted">{user.email}</span>
        </div>

        {/* Stat cards */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-card bg-white p-5 shadow-sm">
              <p className="text-sm text-ink-muted">{s.label}</p>
              <p className="mt-1 text-2xl font-extrabold text-ink">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Spend vs budget */}
        <div className="mt-6 rounded-card bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-ink">
              AI spend this month
            </h2>
            <span className="text-sm text-ink-muted">
              ${spend.toFixed(2)} of ${MONTHLY_BUDGET_USD.toFixed(2)}
            </span>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-pill bg-brand-purple-light">
            <div
              className="h-full rounded-pill bg-brand-purple"
              style={{ width: `${spendPct}%` }}
            />
          </div>
          {spend >= MONTHLY_BUDGET_USD && (
            <p className="mt-2 text-sm font-medium text-red-600">
              Budget reached — generation is paused until next month.
            </p>
          )}
        </div>

        {/* Theme breakdown */}
        <div className="mt-6 rounded-card bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Stories by theme</h2>
          <div className="mt-4 space-y-3">
            {THEME_OPTIONS.map((t, i) => {
              const count = themeCounts[i]?.count ?? 0
              return (
                <div key={t.key} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm text-ink">
                    {t.emoji} {t.label}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-pill bg-parchment">
                    <div
                      className={`h-full rounded-pill bg-theme-${t.key}-text`}
                      style={{ width: `${(count / themeMax) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-semibold text-ink">
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent stories */}
        <div className="mt-6 rounded-card bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Recent stories</h2>
          {recentStories.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">No stories yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink/10">
              {recentStories.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/story/${s.id}`}
                    className="flex items-center gap-3 py-3 hover:opacity-80"
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {s.illustration ?? "📖"}
                    </span>
                    <span className="flex-1 truncate font-medium text-ink">
                      {s.title}
                    </span>
                    <span className="hidden text-sm text-ink-muted sm:inline">
                      for {s.child_name}
                    </span>
                    <span className="shrink-0 text-sm text-ink-muted">
                      {new Date(s.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
