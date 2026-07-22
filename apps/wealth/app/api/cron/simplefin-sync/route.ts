import { NextResponse } from "next/server"
import { isSimpleFinConfigured, syncBankAccounts } from "@/modules/bank-accounts"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Daily SimpleFIN balance sync, invoked by the Vercel cron (vercel.json).
 * Hobby plan crons fire at most once a day; fresher-than-daily balances come
 * from the staleness-gated background sync on dashboard visits (app/page.tsx),
 * capped at once per BANK_SYNC_TTL_MS — comfortably inside SimpleFIN's
 * ~24 requests/day guidance.
 *
 * Guarded by CRON_SECRET — Vercel sends it as a Bearer token. Without the
 * secret configured the route refuses to run rather than running open.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured — SimpleFIN sync cron is disabled." },
      { status: 503 },
    )
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }
  if (!isSimpleFinConfigured()) {
    return NextResponse.json(
      { error: "SimpleFIN isn't configured on this deployment." },
      { status: 503 },
    )
  }

  try {
    const report = await syncBankAccounts()
    // simplefinErrors carries SimpleFIN's own warnings (stale connections,
    // rate limits) plus skipped-account reasons — surfaced in the cron log.
    return NextResponse.json({ ok: true, ...report })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`SimpleFIN sync failed: ${message}`)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
