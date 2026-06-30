import { describe, expect, it } from "vitest"
import { createAnonClaimMarker, parseAnonClaimMarker } from "./anon-claim"

const ANON_ID = "123e4567-e89b-12d3-a456-426614174000"

describe("anonymous claim markers", () => {
  it("round-trips the structured marker format", () => {
    expect(parseAnonClaimMarker(createAnonClaimMarker(ANON_ID))).toBe(ANON_ID)
  })

  it("rejects legacy raw UUID markers from old shared-browser state", () => {
    expect(parseAnonClaimMarker(ANON_ID)).toBeNull()
  })

  it("rejects malformed or non-UUID markers", () => {
    expect(parseAnonClaimMarker(null)).toBeNull()
    expect(parseAnonClaimMarker("{")).toBeNull()
    expect(
      parseAnonClaimMarker(JSON.stringify({ version: 1, anonId: "not-a-uuid" })),
    ).toBeNull()
    expect(
      parseAnonClaimMarker(JSON.stringify({ version: 2, anonId: ANON_ID })),
    ).toBeNull()
  })
})
