"use client"

import { Suspense, useEffect } from "react"
import { usePathname } from "next/navigation"
import { AnalyticsProvider } from "@studio/analytics"
import { Events, useAnalytics } from "@/lib/analytics"
import { createClient } from "@/lib/supabase-browser"

interface AppAnalyticsProps {
  children: React.ReactNode
  posthogKey: string
  posthogHost?: string
}

export function AppAnalytics({
  children,
  posthogKey,
  posthogHost,
}: AppAnalyticsProps) {
  if (!posthogKey) {
    return children
  }

  return (
    <AnalyticsProvider posthogKey={posthogKey} posthogHost={posthogHost}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      <AuthAnalytics />
      {children}
    </AnalyticsProvider>
  )
}

function PageViewTracker() {
  const pathname = usePathname()
  const { track } = useAnalytics()

  useEffect(() => {
    if (!pathname) return
    track(Events.PAGE_VIEW, { path: pathname })
  }, [pathname, track])

  return null
}

function AuthAnalytics() {
  const { track, identify, reset } = useAnalytics()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      if (user && !user.is_anonymous) {
        identify(user.id)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user

      if (user && !user.is_anonymous) {
        identify(user.id)
      }

      if (event === "SIGNED_IN" && user && !user.is_anonymous) {
        track(Events.AUTH_SIGN_IN, {
          provider: user.app_metadata?.provider ?? "email",
        })
      }

      if (event === "SIGNED_OUT") {
        track(Events.AUTH_SIGN_OUT)
        reset()
      }
    })

    return () => subscription.unsubscribe()
  }, [track, identify, reset])

  return null
}
