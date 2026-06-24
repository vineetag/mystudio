import { describe, expect, it } from "vitest"
import { safeAuthRedirectPath } from "./redirects"

describe("safeAuthRedirectPath", () => {
  it("allows known in-app auth destinations", () => {
    expect(safeAuthRedirectPath("/")).toBe("/")
    expect(safeAuthRedirectPath("/library")).toBe("/library")
    expect(safeAuthRedirectPath("/admin")).toBe("/admin")
    expect(safeAuthRedirectPath("/auth/reset-password")).toBe(
      "/auth/reset-password",
    )
    expect(safeAuthRedirectPath("/story/abc123?from=login#top")).toBe(
      "/story/abc123?from=login#top",
    )
  })

  it("falls back for external or ambiguous destinations", () => {
    expect(safeAuthRedirectPath("https://evil.example")).toBe("/library")
    expect(safeAuthRedirectPath("//evil.example")).toBe("/library")
    expect(safeAuthRedirectPath("@evil.example")).toBe("/library")
    expect(safeAuthRedirectPath("/\\evil.example")).toBe("/library")
    expect(safeAuthRedirectPath("/profile")).toBe("/library")
  })

  it("supports a custom fallback", () => {
    expect(safeAuthRedirectPath("https://evil.example", "/")).toBe("/")
  })
})
