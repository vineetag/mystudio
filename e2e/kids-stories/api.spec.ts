import { test, expect } from "@playwright/test"
import { STORAGE_STATE } from "../shared/auth-helpers"

test.describe("API: /api/generate (unauthenticated)", () => {
  test("GET returns 401 when unauthenticated", async ({ request }) => {
    const res = await request.get("/api/generate")
    expect(res.status()).toBe(401)
  })

  test("POST returns 401 when unauthenticated", async ({ request }) => {
    const res = await request.post("/api/generate", {
      data: { childName: "TestKid", themes: ["adventure"] },
    })
    expect(res.status()).toBe(401)
  })
})

test.describe("API: /api/generate (authenticated)", () => {
  // The `request` fixture inherits this storageState, so it sends the
  // session cookies automatically — no manual cookie replay needed.
  test.use({ storageState: STORAGE_STATE })

  test("GET returns limitReached flag when authenticated", async ({ request }) => {
    const res = await request.get("/api/generate")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(typeof body.limitReached).toBe("boolean")
  })

  test("POST with invalid themes returns 400 when authenticated", async ({ request }) => {
    const res = await request.post("/api/generate", {
      data: { childName: "TestKid", themes: ["not-a-real-theme"] },
    })
    expect(res.status()).toBe(400)
  })
})
