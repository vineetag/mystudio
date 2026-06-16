import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/db"

export const runtime = "nodejs"
// Cron may run longer than the default when there are many users to page through.
export const maxDuration = 60

// Anonymous users older than this with zero stories are considered orphaned.
// signInWithOAuth leaves the anon row behind once its stories transfer to the
// permanent account; this reclaims them. The age guard avoids deleting a
// session that is mid-flow (created a story, about to sign up).
const CUTOFF_HOURS = 24
const PAGE = 1000

/**
 * Weekly cron (see vercel.json): deletes orphaned anonymous users.
 * Protected by CRON_SECRET — Vercel sends `Authorization: Bearer <CRON_SECRET>`
 * on scheduled invocations. Requests without it are rejected.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()

  // 1. Every user_id that currently owns a story — these anon users are kept,
  //    since deleting them would cascade-delete their (public) stories.
  const owners = new Set<string>()
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("stories")
      .select("user_id")
      .not("user_id", "is", null)
      .range(from, from + PAGE - 1)
    if (error) {
      console.error("cleanup-anon: stories query failed:", error.message)
      return NextResponse.json({ error: "stories query failed" }, { status: 500 })
    }
    data.forEach((r) => owners.add(r.user_id as string))
    if (data.length < PAGE) break
  }

  // 2. Page through auth users; collect anon + old + storyless.
  const cutoff = Date.now() - CUTOFF_HOURS * 3600 * 1000
  const orphanIds: string[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE })
    if (error) {
      console.error("cleanup-anon: listUsers failed:", error.message)
      return NextResponse.json({ error: "listUsers failed" }, { status: 500 })
    }
    for (const u of data.users) {
      if (
        u.is_anonymous &&
        new Date(u.created_at).getTime() < cutoff &&
        !owners.has(u.id)
      ) {
        orphanIds.push(u.id)
      }
    }
    if (data.users.length < PAGE) break
  }

  // 3. Delete.
  let deleted = 0
  let failed = 0
  for (const id of orphanIds) {
    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error) {
      failed++
      console.error(`cleanup-anon: deleteUser ${id} failed:`, error.message)
    } else {
      deleted++
    }
  }

  console.log(`cleanup-anon: candidates=${orphanIds.length} deleted=${deleted} failed=${failed}`)
  return NextResponse.json({ candidates: orphanIds.length, deleted, failed })
}
