import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  CLAIM_GRANT_TTL_SECONDS,
  createClaimGrant,
  verifyClaimGrant,
} from "./claim-grant"

const ANON_ID = "123e4567-e89b-12d3-a456-426614174000"

describe("claim grant", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-signing-secret")
  })

  it("round-trips a freshly created grant", () => {
    const grant = createClaimGrant(ANON_ID)
    expect(verifyClaimGrant(grant)).toBe(ANON_ID)
  })

  it("rejects a tampered anon id", () => {
    const grant = createClaimGrant(ANON_ID)
    const otherId = "aaaaaaaa-bbbb-1ccc-8ddd-eeeeeeeeeeee"
    const tampered = `${otherId}.${grant.split(".").slice(1).join(".")}`
    expect(verifyClaimGrant(tampered)).toBeNull()
  })

  it("rejects a tampered expiry", () => {
    const [anonId, , signature] = createClaimGrant(ANON_ID).split(".")
    const farFuture = Math.floor(Date.now() / 1000) + 999999
    expect(verifyClaimGrant(`${anonId}.${farFuture}.${signature}`)).toBeNull()
  })

  it("rejects an expired grant", () => {
    const grant = createClaimGrant(ANON_ID)
    const afterExpiry = Date.now() + (CLAIM_GRANT_TTL_SECONDS + 1) * 1000
    expect(verifyClaimGrant(grant, afterExpiry)).toBeNull()
  })

  it("rejects grants signed with a different key", () => {
    const grant = createClaimGrant(ANON_ID)
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "rotated-secret")
    expect(verifyClaimGrant(grant)).toBeNull()
  })

  it("rejects malformed values", () => {
    expect(verifyClaimGrant(null)).toBeNull()
    expect(verifyClaimGrant("")).toBeNull()
    expect(verifyClaimGrant("not-a-grant")).toBeNull()
    expect(verifyClaimGrant(`${ANON_ID}.123`)).toBeNull()
  })

  it("refuses to mint a grant for a non-uuid id", () => {
    expect(() => createClaimGrant("../../etc/passwd")).toThrow()
  })
})
