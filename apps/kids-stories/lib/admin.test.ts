import { describe, expect, it } from "vitest"
import type { User } from "@supabase/supabase-js"
import {
  collectUserEmails,
  getAdminAllowlist,
  isAdminUser,
  normalizeEmailForComparison,
} from "./admin"

describe("normalizeEmailForComparison", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmailForComparison("  Admin@Example.com ")).toBe(
      "admin@example.com",
    )
  })

  it("normalizes gmail dots and plus aliases", () => {
    expect(normalizeEmailForComparison("vine.et140+test@gmail.com")).toBe(
      "vineet140@gmail.com",
    )
    expect(normalizeEmailForComparison("vineet140@googlemail.com")).toBe(
      "vineet140@gmail.com",
    )
  })
})

describe("isAdminUser", () => {
  it("matches allowlisted emails from env", () => {
    process.env.ADMIN_EMAILS = "vineet140@gmail.com,other@example.com"
    expect(getAdminAllowlist()).toEqual([
      "vineet140@gmail.com",
      "other@example.com",
    ])

    const user = {
      email: "vine.et140@gmail.com",
      identities: [],
    } as User

    expect(isAdminUser(user)).toBe(true)
  })

  it("falls back to identity email when primary email is missing", () => {
    process.env.ADMIN_EMAILS = "vineet140@gmail.com"

    const user = {
      email: undefined,
      identities: [
        {
          identity_data: { email: "vineet140@gmail.com" },
        },
      ],
    } as User

    expect(collectUserEmails(user)).toEqual(["vineet140@gmail.com"])
    expect(isAdminUser(user)).toBe(true)
  })
})
