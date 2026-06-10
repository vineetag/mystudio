import Link from "next/link"
import { THEME_OPTIONS } from "../themes"

export interface StoryCardData {
  id: string
  title: string
  child_name: string
  theme: string[]
  illustration: string | null
  created_at: string
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
      <p className="mt-auto pt-2 text-sm text-ink-muted">
        {story.child_name ? `For ${story.child_name} · ` : ""}{date}
      </p>
    </Link>
  )
}
