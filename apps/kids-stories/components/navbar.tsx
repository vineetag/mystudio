"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookOpen, Menu, X } from "lucide-react"
import { createClient } from "@/lib/supabase-browser"

export function Navbar() {
  const router = useRouter()
  // null while we resolve the session — avoids flashing the wrong auth links.
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session?.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.push("/")
    router.refresh()
  }

  const linkClass =
    "flex h-11 items-center px-2 text-base font-semibold text-ink hover:text-brand-purple"

  // Auth-dependent links, shared by desktop and mobile. Rendered only once the
  // session is known.
  function AuthLinks({ onNavigate }: { onNavigate?: () => void }) {
    if (authed === null) return null
    if (authed) {
      return (
        <>
          <Link href="/library" className={linkClass} onClick={onNavigate}>
            Library
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-11 items-center rounded-pill bg-brand-purple px-5 text-base font-semibold text-white hover:bg-brand-purple/90"
          >
            Log out
          </button>
        </>
      )
    }
    return (
      <>
        <Link href="/auth/login" className={linkClass} onClick={onNavigate}>
          Log in
        </Link>
        <Link
          href="/auth/signup"
          onClick={onNavigate}
          className="flex h-11 items-center rounded-pill bg-brand-purple px-5 text-base font-semibold text-white hover:bg-brand-purple/90"
        >
          Sign up
        </Link>
      </>
    )
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-parchment/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xl font-extrabold text-brand-purple"
          onClick={() => setOpen(false)}
        >
          <BookOpen className="h-5 w-5" aria-hidden="true" /> ZippyTales
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <AuthLinks />
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-11 items-center justify-center rounded-input text-ink md:hidden"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="flex flex-col gap-2 border-t border-ink/10 px-6 py-4 md:hidden">
          <AuthLinks onNavigate={() => setOpen(false)} />
        </div>
      )}
    </header>
  )
}
