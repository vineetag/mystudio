"use client"

import { useCallback } from "react"
import posthog from "posthog-js"
import type { EventName } from "./events"

export function useAnalytics() {
  const track = useCallback(
    (event: EventName, properties?: Record<string, unknown>) => {
      posthog.capture(event, properties)
    },
    [],
  )

  const identify = useCallback(
    (userId: string, traits?: Record<string, unknown>) => {
      posthog.identify(userId, traits)
    },
    [],
  )

  const reset = useCallback(() => {
    posthog.reset()
  }, [])

  return { track, identify, reset }
}
