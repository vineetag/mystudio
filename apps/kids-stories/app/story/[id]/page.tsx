import { cache } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/db"
import { Clock, BookmarkPlus, Sparkles } from "lucide-react"
import { THEME_OPTIONS } from "@/modules/kids-stories"
import { PrintButton } from "./print-button"

interface StoryRow {
  id: string
  child_name: string
  theme: string[]
  age_range: string | null
  title: string
  content: string
  illustration: string | null
  created_at: string
}

// Cached per-request so generateMetadata and the page share a single query.
const getStory = cache(async (id: string): Promise<StoryRow | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("stories")
    .select(
      "id, child_name, theme, age_range, title, content, illustration, created_at",
    )
    .eq("id", id)
    .maybeSingle()
  return (data as StoryRow | null) ?? null
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const story = await getStory(id)
  return {
    title: story ? `${story.title} · ZippyTales` : "Story · ZippyTales",
  }
}

// Prominent save CTA for anonymous visitors. Shown both above the story
// (arrival awareness) and again below it (the natural moment to save once
// they've finished reading).
function SaveNudge() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-brand-purple/20 bg-brand-purple/5 px-6 py-5 text-center sm:flex-row sm:text-left">
      <BookmarkPlus className="h-6 w-6 shrink-0 text-brand-purple" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink">Want to keep this story?</p>
        <p className="text-sm text-ink-muted">
          Create a free account and it&apos;ll be saved to your library permanently.
        </p>
      </div>
      <Link
        href="/auth/signup?redirectTo=/library"
        className="shrink-0 inline-flex h-10 items-center justify-center rounded-pill bg-brand-purple px-5 text-sm font-semibold text-white hover:bg-brand-purple/90 transition-colors duration-150"
      >
        Save to library
      </Link>
    </div>
  )
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [story, supabase] = await Promise.all([getStory(id), createClient()])
  if (!story) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAnonymous = !user || (user.is_anonymous ?? false)

  const primaryTheme = story.theme[0] ?? "wonder"
  const themeLabels = story.theme
    .map((k) => THEME_OPTIONS.find((t) => t.key === k)?.label ?? k)
    .join(" · ")
  const paragraphs = story.content.split(/\n{2,}/).filter(Boolean)
  const readMins = Math.ceil(story.content.trim().split(/\s+/).length / 200)

  return (
    <main className="min-h-[calc(100dvh-4rem)] px-6 py-12 animate-fade-in">
      <article className="mx-auto w-full max-w-2xl">
        {/* Save-to-library nudge for anonymous visitors (arrival) */}
        {isAnonymous && (
          <div className="mb-6">
            <SaveNudge />
          </div>
        )}

        <div
          className={`flex flex-col items-center gap-3 rounded-card p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.06)] bg-theme-${primaryTheme}-bg text-theme-${primaryTheme}-text`}
        >
          <span className="text-6xl" aria-hidden="true">
            {story.illustration ?? "📖"}
          </span>
          <span className="text-sm font-semibold uppercase tracking-wide">
            {themeLabels}
          </span>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{story.title}</h1>
          {story.child_name && (
            <p className="text-sm font-medium opacity-80">
              A story for {story.child_name}
            </p>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/10 px-3 py-1 text-xs font-semibold">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {readMins} min read
          </span>
        </div>

        <div className="mt-8 space-y-5 font-serif text-lg leading-relaxed text-ink">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <p className="mt-8 border-t border-ink/8 pt-4 text-center text-xs text-ink-muted/60">
          AI-generated story · for entertainment only ·{" "}
          <Link href="/disclaimer" className="underline underline-offset-2 hover:text-ink-muted transition-colors">
            disclaimer
          </Link>
        </p>

        {/* Save-to-library nudge for anonymous visitors (after reading) */}
        {isAnonymous && (
          <div className="mt-8">
            <SaveNudge />
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-brand-purple px-6 text-base font-semibold text-white hover:bg-brand-purple/90 active:scale-[0.98] transition-all duration-150"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Create another story
          </Link>
          {!isAnonymous && (
            <Link
              href="/library"
              className="inline-flex h-11 items-center justify-center rounded-pill border border-ink/15 px-6 text-base font-semibold text-ink hover:bg-white transition-all duration-150"
            >
              My library
            </Link>
          )}
          <PrintButton />
        </div>
      </article>
    </main>
  )
}
