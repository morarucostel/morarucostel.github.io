import { expect, test } from "@playwright/test";

test("privacy page explains browser preferences and contact form processing", async ({ page }) => {
  await page.goto("/privacy");

  await expect(page.getByRole("heading", { name: "Privacy & Cookies" })).toBeVisible();
  await expect(page.getByText("localStorage", { exact: false })).toBeVisible();
  await expect(page.getByText("Web3Forms", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "moraru_costel at yahoo com" })).toHaveAttribute(
    "href",
    "mailto:"
  );
});
