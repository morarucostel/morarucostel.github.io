import { test, expect } from "@playwright/test";

test("dev server starts and renders home page", async ({ page }) => {
  await page.goto("/");

  // Expect the title to contain "Night Sky Journey Astrophotography Portfolio"
  await expect(page).toHaveTitle(/Night Sky Journey Astrophotography Portfolio/);

  // Expect the hero section or main content to be visible
  await expect(page.locator("main")).toBeVisible();
});
