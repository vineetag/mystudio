"use client"

import posthog from "posthog-js"
import type { EventName } from "./events"

export function useAnalytics() {
  function track(event: EventName, properties?: Record<string, unknown>) {
    posthog.capture(event, properties)
  }

  function identify(userId: string, traits?: Record<string, unknown>) {
    posthog.identify(userId, traits)
  }

  function reset() {
    posthog.reset()
  }

  return { track, identify, reset }
}
