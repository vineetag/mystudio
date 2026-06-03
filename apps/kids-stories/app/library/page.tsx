import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/db"
import { StoryCard, type StoryCardData } from "@/modules/kids-stories"

export const metadata: Metadata = {
  title: "My library · ZippyTales",
}

export default async function LibraryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware already guards /library; this is a defensive backstop.
  if (!user) redirect("/auth/login?redirectTo=/library")

  const { data: stories } = await supabase
    .from("stories")
    .select("id, title, child_name, theme, illustration, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<StoryCardData[]>()

  return (
    <main className="min-h-[calc(100dvh-4rem)] px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            My library
          </h1>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-pill bg-brand-purple px-6 text-base font-semibold text-white hover:bg-brand-purple/90"
          >
            Create a story
          </Link>
        </div>

        {!stories || stories.length === 0 ? (
          <div className="mt-12 rounded-card bg-white p-12 text-center shadow-sm">
            <p className="text-5xl" aria-hidden="true">
              📚
            </p>
            <h2 className="mt-4 text-xl font-bold text-ink">No stories yet</h2>
            <p className="mt-2 text-ink-muted">
              Create your first personalized story and it&apos;ll show up here.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-pill bg-brand-purple px-6 text-base font-semibold text-white hover:bg-brand-purple/90"
            >
              Create a story
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
