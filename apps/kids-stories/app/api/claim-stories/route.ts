import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/db"

export const runtime = "nodejs"

/**
 * Transfers stories from an anonymous user to the currently authenticated user.
 * Called after email/password login when the user had a prior anonymous session
 * with generated stories. Uses the service client to bypass RLS on the stories table.
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
  await svc.from("stories").update({ user_id: user.id }).eq("user_id", anonId)

  return NextResponse.json({ ok: true })
}
