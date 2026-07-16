import { NextResponse } from "next/server"
import { captureSnapshot } from "@/modules/snapshots"
import { isSnapTradeConfigured, syncAllSnapTradeUsers } from "@/modules/snaptrade"

export const dynamic = "force-dynamic"
// SnapTrade sync walks every connection and account before the snapshot —
// allow the full Vercel function window rather than the default.
export const maxDuration = 300

/**
 * Daily portfolio snapshot, invoked by the Vercel cron (vercel.json).
 * Runs the SnapTrade sync first so the snapshot always captures fresh
 * holdings — the Hobby plan allows only once-daily crons, so the evening
 * sync is folded in here instead of being its own schedule.
 *
 * Guarded by CRON_SECRET — Vercel sends it as a Bearer token. Without the
 * secret configured the route refuses to run rather than running open.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured — snapshot cron is disabled." },
      { status: 503 },
    )
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  // Sync is best-effort: a SnapTrade outage shouldn't cost the day's
  // snapshot — it would just be valued from the last synced holdings.
  let syncErrors: string[] = []
  if (isSnapTradeConfigured()) {
    try {
      const { errors } = await syncAllSnapTradeUsers()
      syncErrors = errors
    } catch (error) {
      syncErrors = [error instanceof Error ? error.message : String(error)]
    }
  }

  const result = await captureSnapshot()
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, syncErrors },
      { status: 500 },
    )
  }
  return NextResponse.json({ ok: true, totalValue: result.totalValue, syncErrors })
}
