import type { Page } from "@playwright/test"

const TEST_EMAIL = process.env.TEST_EMAIL ?? ""
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? ""

export async function loginAs(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto("/auth/login")
  await page.fill("#email", email)
  await page.fill("#password", password)
  await page.click('button[type="submit"]')

  // Race: navigation away from login OR an error alert appearing
  const result = await Promise.race([
    page
      .waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 15_000 })
      .then(() => "navigated" as const),
    page
      .locator('[role="alert"]')
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => "error" as const),
  ])

  if (result === "error") {
    const msg = await page.locator('[role="alert"]').textContent()
    throw new Error(`Login failed — Supabase returned: "${msg?.trim()}". Check TEST_EMAIL/TEST_PASSWORD secrets and confirm the test user's email in Supabase Auth → Users.`)
  }
}

export async function logout(page: Page) {
  // Kids-stories navbar renders a logout button when the user is authenticated
  const logoutBtn = page.getByRole("button", { name: /log out|sign out/i })
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click()
    await page.waitForURL("/")
  }
}
