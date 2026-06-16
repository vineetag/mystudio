import { test as setup } from "@playwright/test"
import { loginAs, STORAGE_STATE } from "./auth-helpers"

setup("authenticate", async ({ page }) => {
  await loginAs(page)
  await page.context().storageState({ path: STORAGE_STATE })
})
