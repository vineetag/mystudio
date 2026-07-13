import { beforeEach, describe, expect, it, vi } from "vitest"

const getUser = vi.fn()
const createClaimGrant = vi.fn()

vi.mock("@/lib/claim-grant", () => ({
  CLAIM_GRANT_COOKIE: "zippy_claim_grant",
  CLAIM_GRANT_TTL_SECONDS: 1800,
  createClaimGrant: (anonId: string) => createClaimGrant(anonId),
}))

vi.mock("@/lib/db", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}))

import { POST } from "./route"

const ANON_ID = "123e4567-e89b-12d3-a456-426614174000"

describe("POST /api/claim-stories/stage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects unauthenticated visitors", async () => {
    getUser.mockResolvedValue({ data: { user: null } })

    const response = await POST()

    expect(response.status).toBe(401)
    expect(createClaimGrant).not.toHaveBeenCalled()
  })

  it("rejects permanent users — grants are for anonymous sessions only", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "permanent-user", is_anonymous: false } },
    })

    const response = await POST()

    expect(response.status).toBe(401)
    expect(createClaimGrant).not.toHaveBeenCalled()
  })

  it("sets a signed httpOnly grant cookie for the caller's own anon id", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: ANON_ID, is_anonymous: true } },
    })
    createClaimGrant.mockReturnValue("signed-grant-token")

    const response = await POST()

    expect(response.status).toBe(200)
    expect(createClaimGrant).toHaveBeenCalledWith(ANON_ID)
    const setCookie = response.headers.get("set-cookie") ?? ""
    expect(setCookie).toContain("zippy_claim_grant=signed-grant-token")
    expect(setCookie.toLowerCase()).toContain("httponly")
    expect(setCookie).toContain("Max-Age=1800")
  })
})
