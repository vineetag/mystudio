"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"
import { Button } from "@studio/ui"
import { createClient } from "@/lib/supabase-browser"
import { ThemePicker } from "./theme-picker"
import { AgeSlider } from "./age-slider"
import { GenderPicker } from "./gender-picker"
import { FeaturedObjectPicker } from "./featured-object-picker"
import { StoryLengthPicker } from "./story-length-picker"
import LoadingScreen from "@/components/loading/LoadingScreens"
import type { ThemeKey } from "../themes"

const FORM_STATE_KEY = "story-generator-state"

const inputClass =
  "h-11 w-full rounded-input border border-ink/15 bg-white px-4 text-base text-ink " +
  "placeholder:text-ink-muted focus:border-brand-purple focus:outline-none " +
  "focus:ring-2 focus:ring-brand-purple/30"

export function StoryGenerator() {
  const router = useRouter()

  const [limitReached, setLimitReached] = useState(false)
  const [childName, setChildName] = useState("")
  const [themes, setThemes] = useState<ThemeKey[]>([])
  const [ageRange, setAgeRange] = useState<[number, number] | null>(null)
  const [gender, setGender] = useState<"boy" | "girl" | "">("")
  const [featuredObject, setFeaturedObject] = useState<string[]>([])
  const [storyLength, setStoryLength] = useState<"short" | "medium" | "long">("medium")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(FORM_STATE_KEY)
      if (saved) {
        const s = JSON.parse(saved) as {
          childName?: string
          themes?: ThemeKey[]
          ageRange?: [number, number] | null
          gender?: "boy" | "girl" | ""
          featuredObject?: string[]
          storyLength?: "short" | "medium" | "long"
        }
        if (s.childName !== undefined) setChildName(s.childName)
        if (s.themes !== undefined) setThemes(s.themes)
        if (s.ageRange !== undefined) setAgeRange(s.ageRange)
        if (s.gender !== undefined) setGender(s.gender)
        if (s.featuredObject !== undefined) setFeaturedObject(s.featuredObject)
        if (s.storyLength !== undefined) setStoryLength(s.storyLength)
        sessionStorage.removeItem(FORM_STATE_KEY)
      }
    } catch {}
  }, [])

  function saveFormState() {
    try {
      sessionStorage.setItem(
        FORM_STATE_KEY,
        JSON.stringify({ childName, themes, ageRange, gender, featuredObject, storyLength })
      )
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      // Ensure a session exists before hitting the API. Anonymous sign-in is
      // done here (not in useEffect) so the cookie is guaranteed to be set in
      // the same JS tick as the fetch — no race condition possible.
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        const { data: anon, error: anonError } = await supabase.auth.signInAnonymously()
        if (anonError || !anon.user) {
          toast.error(
            anonError?.message?.includes("captcha")
              ? "Session setup failed — please disable Captcha in Supabase Auth settings."
              : "Unable to start a session. Please refresh and try again."
          )
          return
        }
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName: childName || undefined,
          themes,
          ageRange: ageRange
            ? ageRange[0] === ageRange[1]
              ? `${ageRange[0]} years`
              : `${ageRange[0]}-${ageRange[1]} years`
            : undefined,
          gender: gender || undefined,
          featuredObject: featuredObject.length > 0 ? featuredObject.join(", ") : undefined,
          storyLength,
        }),
      })

      // Defensive: session somehow still missing after sign-in attempt
      if (res.status === 401) {
        saveFormState()
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

  if (loading) {
    return (
      <div className="w-full max-w-xl">
        <LoadingScreen />
      </div>
    )
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

        <div className="space-y-1.5">
          <span className="text-sm font-semibold text-ink">Pick a theme</span>
          <p className="text-xs text-ink-muted">Pick up to 2 themes to blend into your story ✨</p>
          <ThemePicker value={themes} onChange={setThemes} />
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-semibold text-ink">
            Favorite character or object{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </span>
          <p className="text-xs text-ink-muted">Pick up to 3 of your favourite characters or objects</p>
          <FeaturedObjectPicker value={featuredObject} onChange={setFeaturedObject} />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-ink">Story length</span>
          <StoryLengthPicker value={storyLength} onChange={setStoryLength} />
        </div>

        <div className="space-y-2">
          {limitReached && (
            <p className="text-center text-sm font-medium text-amber-600">
              Daily limit reached — come back tomorrow for more stories!
            </p>
          )}
          <Button
            type="submit"
            disabled={themes.length === 0 || limitReached}
            className="h-12 w-full rounded-pill bg-brand-purple text-base text-white hover:bg-brand-purple/90 active:scale-[0.98] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles aria-hidden="true" />
            Create story
          </Button>
        </div>
      </div>
    </form>
  )
}
