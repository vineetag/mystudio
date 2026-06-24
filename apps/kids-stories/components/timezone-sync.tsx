"use client"

import { useEffect } from "react"
import {
  getBrowserTimezone,
  USER_TIMEZONE_COOKIE,
} from "@/lib/timezone"

/** Persists the visitor's IANA timezone in a cookie for server-side date boundaries. */
export function TimezoneSync() {
  useEffect(() => {
    const tz = getBrowserTimezone()
    document.cookie = `${USER_TIMEZONE_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`
  }, [])

  return null
}
