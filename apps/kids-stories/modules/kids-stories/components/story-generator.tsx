"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@studio/ui"
import { createClient } from "@/lib/supabase-browser"
import { ThemePicker } from "./theme-picker"
import type { ThemeKey } from "../themes"

const inputClass =
  "h-11 w-full rounded-input border border-ink/15 bg-white px-4 text-base text-ink " +
  "placeholder:text-ink-muted focus:border-brand-purple focus:outline-none " +
  "focus:ring-2 focus:ring-brand-purple/30"

const AGE_OPTIONS = ["3–4", "5–6", "7–9"]

export function StoryGenerator() {
  const router = useRouter()

  // null = still checking; affects whether the CTA submits or routes to login.
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [childName, setChildName] = useState("")
  const [theme, setTheme] = useState<ThemeKey>("adventure")
  const [ageRange, setAgeRange] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName,
          theme,
          ageRange: ageRange || undefined,
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
      className="w-full max-w-xl rounded-card bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="childName" className="text-sm font-semibold text-ink">
            Who is the story for?
          </label>
          <input
            id="childName"
            type="text"
            required
            maxLength={50}
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="Child's name"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-ink">Pick a theme</span>
          <ThemePicker value={theme} onChange={setTheme} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ageRange" className="text-sm font-semibold text-ink">
            Age range <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <select
            id="ageRange"
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            className={inputClass}
          >
            <option value="">Any age</option>
            {AGE_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a} years
              </option>
            ))}
          </select>
        </div>

        {authed === false ? (
          <Button
            asChild
            className="h-12 w-full rounded-pill bg-brand-purple text-base text-white hover:bg-brand-purple/90"
          >
            <Link href="/auth/login?redirectTo=/">Log in to create a story</Link>
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-pill bg-brand-purple text-base text-white hover:bg-brand-purple/90"
          >
            {loading ? "Writing your story…" : "Create story"}
          </Button>
        )}
      </div>
    </form>
  )
}
