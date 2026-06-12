import { test, expect } from "@playwright/test"

test.describe("Public pages", () => {
  test("home page loads with story generator", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/ZippyTales/)
    await expect(page.getByRole("heading", { name: "ZippyTales", level: 1 })).toBeVisible()
  })

  test("privacy page loads", async ({ page }) => {
    await page.goto("/privacy")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("disclaimer page loads", async ({ page }) => {
    await page.goto("/disclaimer")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("release notes page loads", async ({ page }) => {
    await page.goto("/release-notes")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("login page renders form", async ({ page }) => {
    await page.goto("/auth/login")
    await expect(page.locator("#email")).toBeVisible()
    await expect(page.locator("#password")).toBeVisible()
    await expect(page.getByRole("button", { name: /log in/i })).toBeVisible()
  })

  test("signup page renders form", async ({ page }) => {
    await page.goto("/auth/signup")
    await expect(page.locator("#email")).toBeVisible()
    await expect(page.locator("#password")).toBeVisible()
    await expect(page.getByRole("button", { name: /sign up/i })).toBeVisible()
  })

  test("invalid story URL shows not-found page", async ({ page }) => {
    await page.goto("/story/does-not-exist-00000000")
    await expect(page.getByRole("heading", { name: "This page wandered off" })).toBeVisible()
  })
})
