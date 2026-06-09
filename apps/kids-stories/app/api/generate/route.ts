import { NextResponse } from "next/server"
import { createClient } from "@/lib/db"
import {
  generateStory,
  THEMES,
  type Theme,
  DailyLimitError,
  SpendCapError,
  AIContentError,
} from "@/lib/ai"

export const runtime = "nodejs"

const MAX_NAME_LENGTH = 50

export async function POST(request: Request) {
  // 1. Require an authenticated user (story + log inserts are RLS-gated to them).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  // 2. Validate input.
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const { childName, themes, ageRange } = (body ?? {}) as {
    childName?: unknown
    themes?: unknown
    ageRange?: unknown
  }

  const name = typeof childName === "string" ? childName.trim().slice(0, MAX_NAME_LENGTH) : ""

  if (
    !Array.isArray(themes) ||
    themes.length === 0 ||
    themes.length > 2 ||
    !themes.every((t) => typeof t === "string" && THEMES.includes(t as Theme))
  ) {
    return NextResponse.json(
      { error: "Please select 1–2 valid themes." },
      { status: 400 },
    )
  }
  const age = typeof ageRange === "string" ? ageRange.trim().slice(0, 20) : undefined

  // 3. Generate (enforces daily + monthly limits inside lib/ai.ts).
  let story
  try {
    story = await generateStory({
      userId: user.id,
      childName: name || undefined,
      themes: themes as Theme[],
      ageRange: age,
    })
  } catch (err) {
    if (err instanceof DailyLimitError) {
      return NextResponse.json(
        { error: err.message, code: "daily_limit" },
        { status: 429 },
      )
    }
    if (err instanceof SpendCapError) {
      return NextResponse.json(
        { error: "Story generation is paused for now. Please try again later.", code: "spend_cap" },
        { status: 503 },
      )
    }
    if (err instanceof AIContentError) {
      return NextResponse.json({ error: err.message }, { status: 502 })
    }
    console.error("generateStory failed:", err)
    return NextResponse.json(
      { error: "Something went wrong generating the story." },
      { status: 500 },
    )
  }

  // 4. Persist the story (RLS-gated to this user). The daily slot was already
  // consumed atomically inside generateStory (claim_generation_slot).
  const { data: saved, error: saveError } = await supabase
    .from("stories")
    .insert({
      user_id: user.id,
      child_name: name,
      theme: themes,
      age_range: age ?? null,
      title: story.title,
      content: story.content,
      illustration: story.illustration,
      is_public: true,
    })
    .select("id")
    .single()

  if (saveError || !saved) {
    console.error("story insert failed:", saveError)
    return NextResponse.json(
      { error: "The story was created but could not be saved." },
      { status: 500 },
    )
  }

  return NextResponse.json({ id: saved.id, ...story }, { status: 201 })
}
