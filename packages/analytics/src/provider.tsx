"use client"

import React, { useEffect } from "react"
import posthog from "posthog-js"
import { PostHogProvider } from "posthog-js/react"

interface AnalyticsProviderProps {
  children: React.ReactNode
  posthogKey: string
  posthogHost?: string
}

export function AnalyticsProvider({
  children,
  posthogKey,
  posthogHost = "https://app.posthog.com",
}: AnalyticsProviderProps) {
  useEffect(() => {
    if (posthogKey) {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: "identified_only",
        capture_pageview: false,
        capture_pageleave: true,
      })
    }
  }, [posthogKey, posthogHost])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
