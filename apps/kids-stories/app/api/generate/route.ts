import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/db"
import { timezoneFromRequest } from "@/lib/timezone"
import {
  generateStory,
  THEMES,
  type Theme,
  DailyLimitError,
  SpendCapError,
  AIContentError,
  DAILY_STORY_LIMIT,
} from "@/lib/ai"
import { screenStory, UNSAFE_STORY_MESSAGE } from "@/modules/safety"

export const runtime = "nodejs"

const MAX_NAME_LENGTH = 50

async function refundGenerationSlot(userId: string, tz: string) {
  const supabase = createServiceClient()
  const { error } = await supabase.rpc("release_generation_slot", {
    uid: userId,
    tz,
  })
  if (error) {
    console.error("release_generation_slot failed:", error)
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
  }

  const tz = timezoneFromRequest(request)

  const { data: used, error } = await supabase.rpc("stories_generated_today", {
    uid: user.id,
    tz,
  })
  if (error) {
    return NextResponse.json({ error: "Could not check limit." }, { status: 500 })
  }

  return NextResponse.json({ limitReached: Number(used ?? 0) >= DAILY_STORY_LIMIT })
}

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

  const { childName, themes, ageRange, gender, featuredObject, storyLength } = (body ?? {}) as {
    childName?: unknown
    themes?: unknown
    ageRange?: unknown
    gender?: unknown
    featuredObject?: unknown
    storyLength?: unknown
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

  const parsedGender =
    typeof gender === "string" && (gender === "boy" || gender === "girl")
      ? (gender as "boy" | "girl")
      : undefined

  const parsedFeaturedObject =
    typeof featuredObject === "string"
      ? featuredObject.replace(/<[^>]*>/g, "").trim().slice(0, 40) || undefined
      : undefined

  const parsedStoryLength: "short" | "medium" | "long" =
    storyLength === "short" || storyLength === "long" ? storyLength : "medium"

  const tz = timezoneFromRequest(request, body as { timezone?: unknown })

  // 3. Generate (enforces daily + monthly limits inside lib/ai.ts).
  let story
  try {
    story = await generateStory({
      userId: user.id,
      timezone: tz,
      childName: name || undefined,
      themes: themes as Theme[],
      ageRange: age,
      gender: parsedGender,
      featuredObject: parsedFeaturedObject,
      storyLength: parsedStoryLength,
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

  // 3b. Screen for age-appropriateness BEFORE persisting or returning. The
  // daily slot was already consumed by generateStory, so refund it whenever we
  // don't deliver a story (blocked content or a paused spend cap) — the user
  // shouldn't lose their allowance through no fault of their own.
  try {
    const safety = await screenStory({
      userId: user.id,
      title: story.title,
      content: story.content,
    })
    if (safety.action === "block") {
      console.warn("story blocked by safety screen:", {
        reason: safety.reason,
        ageAppropriate: safety.verdict?.ageAppropriate,
        scores: safety.verdict?.scores,
        concerns: safety.verdict?.concerns,
      })
      await refundGenerationSlot(user.id, tz)
      return NextResponse.json(
        { error: UNSAFE_STORY_MESSAGE, code: "unsafe_content" },
        { status: 422 },
      )
    }
  } catch (err) {
    await refundGenerationSlot(user.id, tz)
    if (err instanceof SpendCapError) {
      return NextResponse.json(
        { error: "Story generation is paused for now. Please try again later.", code: "spend_cap" },
        { status: 503 },
      )
    }
    console.error("story screening failed:", err)
    return NextResponse.json(
      { error: "We couldn't safety-check the story. Please try again." },
      { status: 502 },
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
