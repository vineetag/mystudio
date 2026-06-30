import { beforeEach, describe, expect, it, vi } from "vitest"

const getUser = vi.fn()
const getCookie = vi.fn()

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: getCookie,
  })),
}))

vi.mock("@/lib/db", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}))

import { POST } from "./route"

describe("POST /api/claim-stories", () => {
  beforeEach(() => {
    getUser.mockReset()
    getCookie.mockReset()
  })

  it("rejects anonymous users", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "anon-user", is_anonymous: true } },
    })

    const response = await POST()

    expect(response.status).toBe(401)
  })

  it("clears a legacy claim cookie without transferring story ownership", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "permanent-user", is_anonymous: false } },
    })
    getCookie.mockReturnValue({ value: "123e4567-e89b-12d3-a456-426614174000" })

    const response = await POST()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, hadClaim: true })
    expect(response.headers.get("set-cookie")).toContain("zippy_anon_claim=")
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0")
  })
})
