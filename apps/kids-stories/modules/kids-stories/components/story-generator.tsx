"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@studio/ui"
import { createClient } from "@/lib/supabase-browser"
import { ThemePicker } from "./theme-picker"
import { AgeSlider } from "./age-slider"
import { GenderPicker } from "./gender-picker"
import { FeaturedObjectPicker } from "./featured-object-picker"
import { StoryLengthPicker } from "./story-length-picker"
import type { ThemeKey } from "../themes"

const inputClass =
  "h-11 w-full rounded-input border border-ink/15 bg-white px-4 text-base text-ink " +
  "placeholder:text-ink-muted focus:border-brand-purple focus:outline-none " +
  "focus:ring-2 focus:ring-brand-purple/30"

export function StoryGenerator() {
  const router = useRouter()

  // null = still checking; affects whether the CTA submits or routes to login.
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [childName, setChildName] = useState("")
  const [themes, setThemes] = useState<ThemeKey[]>([])
  const [ageRange, setAgeRange] = useState<[number, number] | null>(null)
  const [gender, setGender] = useState<"boy" | "girl" | "">("")
  const [featuredObject, setFeaturedObject] = useState("")
  const [storyLength, setStoryLength] = useState<"short" | "medium" | "long">("medium")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const isAuthed = !!data.user
      setAuthed(isAuthed)
      if (isAuthed) {
        const res = await fetch("/api/generate").catch(() => null)
        if (res?.ok) {
          const d = (await res.json().catch(() => ({}))) as { limitReached?: boolean }
          setLimitReached(d.limitReached === true)
        }
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName: childName || undefined,
          themes,
          ageRange: ageRange ? `${ageRange[0]}-${ageRange[1]} years` : undefined,
          gender: gender || undefined,
          featuredObject: featuredObject || undefined,
          storyLength,
        }),
      })

      if (res.status === 401) {
        // Session expired between mount and submit — send them to log in.
        router.push("/auth/login?redirectTo=/")
        return
      }

      const data = (await res.json().catch(() => ({}))) as {
        id?: string
        error?: string
      }

      if (res.status === 429) {
        setLimitReached(true)
        return
      }

      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong. Please try again.")
        return
      }

      toast.success("Your story is ready!")
      router.push(`/story/${data.id}`)
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl rounded-card bg-white p-6 sm:p-8 shadow-[0_4px_24px_rgba(127,119,221,0.12),0_1px_4px_rgba(0,0,0,0.05)] border border-brand-purple/10"
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="childName" className="text-sm font-semibold text-ink">
            Who is the story for?{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            id="childName"
            type="text"
            maxLength={50}
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="Child's name — or leave blank to let the story decide"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-ink">
            Gender <span className="font-normal text-ink-muted">(optional)</span>
          </span>
          <GenderPicker value={gender} onChange={setGender} />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-ink">
            Age range <span className="font-normal text-ink-muted">(optional)</span>
          </span>
          <AgeSlider value={ageRange} onChange={setAgeRange} />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-ink">Pick a theme</span>
          <ThemePicker value={themes} onChange={setThemes} />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-ink">
            Favorite character or object{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </span>
          <FeaturedObjectPicker value={featuredObject} onChange={setFeaturedObject} />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-ink">Story length</span>
          <StoryLengthPicker value={storyLength} onChange={setStoryLength} />
        </div>

        {authed === false ? (
          <Button
            asChild
            className="h-12 w-full rounded-pill bg-brand-purple text-base text-white hover:bg-brand-purple/90 active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            <Link href="/auth/login?redirectTo=/">Log in to create a story</Link>
          </Button>
        ) : (
          <div className="space-y-2">
            {limitReached && (
              <p className="text-center text-sm font-medium text-amber-600">
                Daily limit reached — 5 stories per day. Check back tomorrow!
              </p>
            )}
            <Button
              type="submit"
              disabled={loading || themes.length === 0 || limitReached}
              className="h-12 w-full rounded-pill bg-brand-purple text-base text-white hover:bg-brand-purple/90 active:scale-[0.98] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Writing your story…
                </span>
              ) : (
                "✨ Create story"
              )}
            </Button>
          </div>
        )}
      </div>
    </form>
  )
}
