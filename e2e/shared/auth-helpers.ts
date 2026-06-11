import type { Page } from "@playwright/test"

const TEST_EMAIL = process.env.TEST_EMAIL ?? ""
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? ""

export async function loginAs(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto("/auth/login")
  await page.fill("#email", email)
  await page.fill("#password", password)
  await page.click('button[type="submit"]')
  // Wait for redirect away from /auth/login
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 10_000 })
}

export async function logout(page: Page) {
  // Kids-stories navbar renders a logout button when the user is authenticated
  const logoutBtn = page.getByRole("button", { name: /log out|sign out/i })
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click()
    await page.waitForURL("/")
  }
}
