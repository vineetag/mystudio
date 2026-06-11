import Link from "next/link"
import { Clock } from "lucide-react"
import { THEME_OPTIONS } from "../themes"

export interface StoryCardData {
  id: string
  title: string
  child_name: string
  theme: string[]
  illustration: string | null
  created_at: string
  content?: string
}

export function StoryCard({ story }: { story: StoryCardData }) {
  const primaryTheme = story.theme[0] ?? "wonder"
  const themeLabels = story.theme
    .map((k) => THEME_OPTIONS.find((t) => t.key === k)?.label ?? k)
    .join(" · ")
  const date = new Date(story.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
  const readMins = story.content
    ? Math.ceil(story.content.trim().split(/\s+/).length / 200)
    : null

  return (
    <Link
      href={`/story/${story.id}`}
      className="flex flex-col rounded-card bg-white p-5 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
    >
      <div
        className={`mb-4 flex h-24 items-center justify-center rounded-card text-5xl bg-theme-${primaryTheme}-bg`}
        aria-hidden="true"
      >
        {story.illustration ?? "📖"}
      </div>
      <span
        className={`text-xs font-semibold uppercase tracking-wide text-theme-${primaryTheme}-text`}
      >
        {themeLabels}
      </span>
      <h3 className="mt-1 line-clamp-2 text-lg font-bold text-ink">
        {story.title}
      </h3>
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <p className="text-sm text-ink-muted">
          {story.child_name ? `For ${story.child_name} · ` : ""}{date}
        </p>
        {readMins !== null && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-purple/10 px-2.5 py-0.5 text-xs font-semibold text-brand-purple">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {readMins} min
          </span>
        )}
      </div>
    </Link>
  )
}
