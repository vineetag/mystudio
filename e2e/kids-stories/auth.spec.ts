import { test, expect } from "@playwright/test"
import { loginAs } from "../shared/auth-helpers"

test.describe("Auth flows", () => {
  test("login with valid credentials redirects to library", async ({ page }) => {
    await loginAs(page)
    // After login, window.location.href redirects to /library by default
    await expect(page).toHaveURL(/\/(library|$)/)
  })

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/auth/login")
    await page.fill("#email", process.env.TEST_EMAIL ?? "")
    await page.fill("#password", "wrong-password-xyz")
    await page.click('button[type="submit"]')
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 8_000 })
  })

  test("forgot-password page loads", async ({ page }) => {
    await page.goto("/auth/forgot-password")
    await expect(page.locator("#email")).toBeVisible()
  })

  test("accessing /library unauthenticated redirects to login", async ({ page }) => {
    await page.goto("/library")
    await expect(page).toHaveURL(/\/auth\/login/)
    // redirectTo param must be preserved so user lands on /library after login
    await expect(page.url()).toContain("redirectTo")
  })

  test("accessing /admin unauthenticated redirects to login", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})
