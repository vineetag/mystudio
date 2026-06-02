"use client"

import { useAnalytics as useAnalyticsBase, Events } from "@studio/analytics"

export { Events }

export function useAnalytics() {
  return useAnalyticsBase()
}
