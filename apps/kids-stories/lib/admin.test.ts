import { afterEach, describe, expect, it } from "vitest"
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
    expect(normalizeEmailForComparison("ad.min140+test@gmail.com")).toBe(
      "admin140@gmail.com",
    )
    expect(normalizeEmailForComparison("admin140@googlemail.com")).toBe(
      "admin140@gmail.com",
    )
  })
})

describe("isAdminUser", () => {
  afterEach(() => {
    delete process.env.ADMIN_EMAILS
    delete process.env.ADMIN_EMAIL
  })

  it("matches allowlisted emails from env", () => {
    process.env.ADMIN_EMAILS = "admin140@gmail.com,other@example.com"
    expect(getAdminAllowlist()).toEqual([
      "admin140@gmail.com",
      "other@example.com",
    ])

    const user = {
      email: "ad.min140@gmail.com",
      identities: [],
    } as unknown as User

    expect(isAdminUser(user)).toBe(true)
  })

  it("falls back to identity email when primary email is missing", () => {
    process.env.ADMIN_EMAILS = "admin140@gmail.com"

    const user = {
      email: undefined,
      identities: [
        {
          identity_data: { email: "admin140@gmail.com" },
        },
      ],
    } as unknown as User

    expect(collectUserEmails(user)).toEqual(["admin140@gmail.com"])
    expect(isAdminUser(user)).toBe(true)
  })

  it("does not trust pending email changes for admin access", () => {
    process.env.ADMIN_EMAILS = "admin140@gmail.com"

    const user = {
      email: "attacker@example.com",
      new_email: "ad.min140+pending@gmail.com",
      identities: [],
    } as unknown as User

    expect(collectUserEmails(user)).toEqual(["attacker@example.com"])
    expect(isAdminUser(user)).toBe(false)
  })
})
