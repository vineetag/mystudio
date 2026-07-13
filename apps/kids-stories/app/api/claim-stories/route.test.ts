import { beforeEach, describe, expect, it, vi } from "vitest"

const getUser = vi.fn()
const getCookie = vi.fn()
const verifyClaimGrant = vi.fn()
const getUserById = vi.fn()
const deleteUser = vi.fn()
const updateSelect = vi.fn()

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: getCookie,
  })),
}))

vi.mock("@/lib/anon-claim", () => ({
  ANON_CLAIM_COOKIE: "zippy_anon_claim",
}))

vi.mock("@/lib/claim-grant", () => ({
  CLAIM_GRANT_COOKIE: "zippy_claim_grant",
  verifyClaimGrant: (value: string | null) => verifyClaimGrant(value),
}))

vi.mock("@/lib/db", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
  createServiceClient: vi.fn(() => ({
    auth: { admin: { getUserById, deleteUser } },
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: updateSelect,
        })),
      })),
    })),
  })),
}))

import { POST } from "./route"

const ANON_ID = "123e4567-e89b-12d3-a456-426614174000"

describe("POST /api/claim-stories", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects anonymous users", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: ANON_ID, is_anonymous: true } },
    })

    const response = await POST()

    expect(response.status).toBe(401)
  })

  it("clears cookies without transferring when there is no valid grant", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "permanent-user", is_anonymous: false } },
    })
    getCookie.mockReturnValue({ value: "forged-or-stale" })
    verifyClaimGrant.mockReturnValue(null)

    const response = await POST()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, claimed: 0 })
    expect(updateSelect).not.toHaveBeenCalled()
    const setCookie = response.headers.get("set-cookie") ?? ""
    expect(setCookie).toContain("zippy_claim_grant=")
    expect(setCookie).toContain("zippy_anon_claim=")
    expect(setCookie).toContain("Max-Age=0")
  })

  it("does not transfer when the grant belongs to the current user (linkIdentity upgrade)", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: ANON_ID, is_anonymous: false } },
    })
    getCookie.mockReturnValue({ value: "grant" })
    verifyClaimGrant.mockReturnValue(ANON_ID)

    const response = await POST()

    await expect(response.json()).resolves.toEqual({ ok: true, claimed: 0 })
    expect(updateSelect).not.toHaveBeenCalled()
  })

  it("refuses to transfer from a non-anonymous source user", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "permanent-user", is_anonymous: false } },
    })
    getCookie.mockReturnValue({ value: "grant" })
    verifyClaimGrant.mockReturnValue(ANON_ID)
    getUserById.mockResolvedValue({
      data: { user: { id: ANON_ID, is_anonymous: false } },
      error: null,
    })

    const response = await POST()

    await expect(response.json()).resolves.toEqual({ ok: true, claimed: 0 })
    expect(updateSelect).not.toHaveBeenCalled()
  })

  it("transfers stories with a valid grant and deletes the anon user", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "permanent-user", is_anonymous: false } },
    })
    getCookie.mockReturnValue({ value: "grant" })
    verifyClaimGrant.mockReturnValue(ANON_ID)
    getUserById.mockResolvedValue({
      data: { user: { id: ANON_ID, is_anonymous: true } },
      error: null,
    })
    updateSelect.mockResolvedValue({
      data: [{ id: "s1" }, { id: "s2" }],
      error: null,
    })
    deleteUser.mockResolvedValue({ error: null })

    const response = await POST()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, claimed: 2 })
    expect(deleteUser).toHaveBeenCalledWith(ANON_ID)
    const setCookie = response.headers.get("set-cookie") ?? ""
    expect(setCookie).toContain("zippy_claim_grant=")
    expect(setCookie).toContain("Max-Age=0")
  })

  it("returns 500 and keeps the grant when the transfer fails", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "permanent-user", is_anonymous: false } },
    })
    getCookie.mockReturnValue({ value: "grant" })
    verifyClaimGrant.mockReturnValue(ANON_ID)
    getUserById.mockResolvedValue({
      data: { user: { id: ANON_ID, is_anonymous: true } },
      error: null,
    })
    updateSelect.mockResolvedValue({ data: null, error: { message: "boom" } })

    const response = await POST()

    expect(response.status).toBe(500)
    expect(deleteUser).not.toHaveBeenCalled()
    expect(response.headers.get("set-cookie")).toBeNull()
  })
})
