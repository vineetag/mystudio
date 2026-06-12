import type { Page } from "@playwright/test"

const TEST_EMAIL = process.env.TEST_EMAIL ?? ""
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? ""

export async function loginAs(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto("/auth/login")
  await page.fill("#email", email)
  await page.fill("#password", password)
  await page.click('button[type="submit"]')

  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 15_000 })
  } catch {
    // Still on /auth/login — extract the specific form error (not Sonner toasts)
    const formError = await page.locator("form p[role='alert']").textContent().catch(() => null)
    const pageTitle = await page.title()
    throw new Error(
      `Login did not redirect after 15s. Page: "${pageTitle}". ` +
      `Form error: "${formError?.trim() ?? "none"}". ` +
      `Check TEST_EMAIL/TEST_PASSWORD secrets and confirm the test user's email in Supabase Auth → Users.`
    )
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
