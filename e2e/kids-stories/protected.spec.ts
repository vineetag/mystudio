import { test, expect } from "@playwright/test"
import { loginAs, logout } from "../shared/auth-helpers"

test.describe("Protected routes (requires auth)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page)
  })

  test("library page loads after login", async ({ page }) => {
    await page.goto("/library")
    await expect(page).toHaveURL("/library")
    // Either shows stories grid or empty-state heading
    const heading = page.getByRole("heading", { name: /my library/i })
    await expect(heading).toBeVisible()
  })

  test("library empty state renders correctly when no stories", async ({ page }) => {
    await page.goto("/library")
    // The "Create a story" link is present regardless of story count
    const createLinks = page.getByRole("link", { name: /create a story/i })
    await expect(createLinks.first()).toBeVisible()
  })

  test("logout clears session", async ({ page }) => {
    await page.goto("/")
    await logout(page)
    // After logout, /library redirects to signup (not login) — unauthenticated
    // users are prompted to create an account so their anon stories transfer.
    await page.goto("/library")
    await expect(page).toHaveURL(/\/auth\/signup/)
  })
})
