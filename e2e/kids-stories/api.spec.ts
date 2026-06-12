import { test, expect } from "@playwright/test"
import { loginAs } from "../shared/auth-helpers"

test.describe("API: /api/generate", () => {
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

  test("GET returns limitReached flag when authenticated", async ({ page, request }) => {
    await loginAs(page)
    // Grab the session cookies and replay them on the API request context
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ")

    const res = await request.get("/api/generate", {
      headers: { Cookie: cookieHeader },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(typeof body.limitReached).toBe("boolean")
  })

  test("POST with invalid themes returns 400 when authenticated", async ({ page, request }) => {
    await loginAs(page)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ")

    const res = await request.post("/api/generate", {
      data: { childName: "TestKid", themes: ["not-a-real-theme"] },
      headers: { Cookie: cookieHeader },
    })
    expect(res.status()).toBe(400)
  })
})
