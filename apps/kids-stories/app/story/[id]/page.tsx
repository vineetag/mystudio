import { cache } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/db"
import { THEME_OPTIONS } from "@/modules/kids-stories"

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

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const story = await getStory(id)
  if (!story) notFound()

  const primaryTheme = story.theme[0] ?? "wonder"
  const themeLabels = story.theme
    .map((k) => THEME_OPTIONS.find((t) => t.key === k)?.label ?? k)
    .join(" · ")
  const paragraphs = story.content.split(/\n{2,}/).filter(Boolean)

  return (
    <main className="min-h-[calc(100dvh-4rem)] px-6 py-12 animate-fade-in">
      <article className="mx-auto w-full max-w-2xl">
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
        </div>

        <div className="mt-8 space-y-5 font-serif text-lg leading-relaxed text-ink">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-pill bg-brand-purple px-6 text-base font-semibold text-white hover:bg-brand-purple/90 active:scale-[0.98] transition-all duration-150"
          >
            ✨ Create another story
          </Link>
          <Link
            href="/library"
            className="inline-flex h-11 items-center justify-center rounded-pill border border-ink/15 px-6 text-base font-semibold text-ink hover:bg-white transition-all duration-150"
          >
            My library
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 items-center justify-center rounded-pill border border-ink/15 px-6 text-base font-semibold text-ink hover:bg-white transition-all duration-150 cursor-pointer print:hidden"
          >
            Print story
          </button>
        </div>
      </article>
    </main>
  )
}
