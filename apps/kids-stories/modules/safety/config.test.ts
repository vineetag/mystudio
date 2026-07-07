import { describe, expect, it } from "vitest"
import { isSafetyEnabled } from "./config"

describe("isSafetyEnabled", () => {
  it("honors an explicit disable in every environment", () => {
    expect(
      isSafetyEnabled({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        STORY_SAFETY_ENABLED: "false",
      }),
    ).toBe(false)
  })

  it("allows an explicit enable in local development", () => {
    expect(
      isSafetyEnabled({
        NODE_ENV: "development",
        STORY_SAFETY_ENABLED: "true",
      }),
    ).toBe(true)
  })

  it("disables only local development by default", () => {
    expect(isSafetyEnabled({ NODE_ENV: "development" })).toBe(false)
  })

  it("enables Vercel preview deployments by default", () => {
    expect(
      isSafetyEnabled({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
      }),
    ).toBe(true)
  })
})
