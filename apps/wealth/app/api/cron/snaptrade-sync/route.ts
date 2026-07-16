import { NextResponse } from "next/server"
import { isSnapTradeConfigured, syncAllSnapTradeUsers } from "@/modules/snaptrade"

export const dynamic = "force-dynamic"
// One sync walks every connection, account, and its open orders — allow the
// full Vercel function window rather than the default.
export const maxDuration = 300

/**
 * Morning SnapTrade sync, invoked by the Vercel cron (vercel.json) at US
 * market open. The evening sync runs inside the snapshot cron (Hobby plan
 * crons fire at most once a day each), so holdings — including still-open
 * buy orders — refresh twice a day.
 *
 * Guarded by CRON_SECRET — Vercel sends it as a Bearer token. Without the
 * secret configured the route refuses to run rather than running open.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured — SnapTrade sync cron is disabled." },
      { status: 503 },
    )
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }
  if (!isSnapTradeConfigured()) {
    return NextResponse.json(
      { error: "SnapTrade isn't configured on this deployment." },
      { status: 503 },
    )
  }

  const { users, reports, errors } = await syncAllSnapTradeUsers()
  const summary = {
    users,
    accounts: reports.reduce((sum, report) => sum + report.accounts, 0),
    holdings: reports.reduce((sum, report) => sum + report.holdings, 0),
    pendingBuys: reports.reduce((sum, report) => sum + report.pendingBuys, 0),
    skipped: reports.flatMap((report) => report.skipped),
    errors,
  }
  if (errors.length > 0 && reports.length === 0) {
    return NextResponse.json({ ok: false, ...summary }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ...summary })
}
