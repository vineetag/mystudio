import { NextResponse } from "next/server"
import { captureSnapshot } from "@/modules/snapshots"

export const dynamic = "force-dynamic"

/**
 * Daily portfolio snapshot, invoked by the Vercel cron (vercel.json).
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

  const result = await captureSnapshot()
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true, totalValue: result.totalValue })
}
