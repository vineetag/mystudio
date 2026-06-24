"use client"

import { useEffect } from "react"
import { Events, useAnalytics } from "@/lib/analytics"

interface StoryViewTrackerProps {
  storyId: string
  themes: string[]
}

export function StoryViewTracker({ storyId, themes }: StoryViewTrackerProps) {
  const { track } = useAnalytics()

  useEffect(() => {
    track(Events.FEATURE_USED, {
      feature: "story_viewed",
      story_id: storyId,
      themes,
    })
  }, [storyId, themes, track])

  return null
}
