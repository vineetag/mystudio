import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/db"

export const runtime = "nodejs"

/**
 * Transfers stories from an anonymous user to the currently authenticated user.
 * Called by StoryClaimer after a visitor who generated stories anonymously signs
 * into a permanent account. Uses the service client to bypass RLS on the move.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const anonId = typeof (body as { anonId?: unknown }).anonId === "string"
    ? (body as { anonId: string }).anonId
    : null

  if (!anonId || anonId === user.id) {
    return NextResponse.json({ ok: true })
  }

  const svc = createServiceClient()

  // Security: only claim stories from a source that is actually an anonymous
  // user. Without this, any signed-in user could pass another user's id and
  // seize their stories (IDOR).
  const { data: source } = await svc.auth.admin.getUserById(anonId)
  if (!source.user?.is_anonymous) {
    return NextResponse.json({ ok: true })
  }

  await svc.from("stories").update({ user_id: user.id }).eq("user_id", anonId)

  return NextResponse.json({ ok: true })
}
