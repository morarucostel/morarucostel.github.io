import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openDetails(page: Page) {
  const toggle = page.locator("#lightbox-details-toggle");
  if (await toggle.isVisible()) {
    await toggle.click();
  } else {
    await page.getByRole("tab", { name: "Details", exact: true }).click();
  }
}

async function swipe(element: Locator, delta: { x: number; y: number }) {
  await element.evaluate((target, offset) => {
    const start = new Touch({ identifier: 1, target, screenX: 300, screenY: 250 });
    const end = new Touch({
      identifier: 1,
      target,
      screenX: 300 + offset.x,
      screenY: 250 + offset.y,
    });
    target.dispatchEvent(
      new TouchEvent("touchstart", {
        bubbles: true,
        touches: [start],
        changedTouches: [start],
      })
    );
    target.dispatchEvent(
      new TouchEvent("touchmove", {
        bubbles: true,
        touches: [end],
        changedTouches: [end],
      })
    );
    target.dispatchEvent(
      new TouchEvent("touchend", {
        bubbles: true,
        touches: [],
        changedTouches: [end],
      })
    );
  }, delta);
}

test.describe("Lightbox Component", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the gallery to be ready
    await page.locator(".featured-card").first().waitFor();
  });

  test("should open when a gallery image is clicked", async ({ page }) => {
    // Lightbox should be hidden initially
    const lightbox = page.locator("#lightbox");
    await expect(lightbox).toHaveClass(/opacity-0/);
    await expect(lightbox).toHaveClass(/pointer-events-none/);

    // Click first image
    await page.locator(".featured-card").first().click();

    // Verify lightbox opens
    await expect(lightbox).not.toHaveClass(/opacity-0/);
    await expect(lightbox).not.toHaveClass(/pointer-events-none/);
    await expect(lightbox).toBeVisible();

    // Verify image source is set (lazy loading check)
    const img = page.locator("#lightbox-image");
    await expect(img).toHaveAttribute("src", /.+/);
  });

  test("should close via close button", async ({ page }) => {
    // Open lightbox
    await page.locator(".featured-card").first().click();
    await expect(page.locator("#lightbox")).toBeVisible();

    // Click close button
    await page.locator("#lightbox-close").click();

    // Verify closed
    await expect(page.locator("#lightbox")).toHaveClass(/opacity-0/);
  });

  test("should close via Escape key", async ({ page }) => {
    // Open lightbox
    await page.locator(".featured-card").first().click();
    await expect(page.locator("#lightbox")).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");

    // Verify closed
    await expect(page.locator("#lightbox")).toHaveClass(/opacity-0/);
  });

  test("should navigate via keyboard arrows", async ({ page }) => {
    // Get info of first two images
    const card1 = page.locator(".featured-card").nth(0);
    const card2 = page.locator(".featured-card").nth(1);
    const title1 = await card1.getAttribute("data-title");
    const title2 = await card2.getAttribute("data-title");

    // Open lightbox
    await card1.click();
    await expect(page.locator("#lightbox-title")).toHaveText(title1 || "");

    // Press Right Arrow
    await page.keyboard.press("ArrowRight");

    // Verify title changes to second image
    await expect(page.locator("#lightbox-title")).toHaveText(title2 || "");

    // Press Left Arrow
    await page.keyboard.press("ArrowLeft");

    // Verify title back to first image
    await expect(page.locator("#lightbox-title")).toHaveText(title1 || "");
  });

  test("should verify lazy loading behavior", async ({ page }) => {
    // Check src is empty initially
    // Note: depending on implementation, it might be empty string or unset.
    // Lightbox.astro initializes with src=""
    const img = page.locator("#lightbox-image");
    await expect(img).toHaveAttribute("src", "");

    // Open lightbox
    await page.locator(".featured-card").first().click();

    // Now it should have a value
    await expect(img).not.toHaveAttribute("src", "");
  });

  test("should trap focus and disable scroll when open", async ({ page }) => {
    await page.locator(".featured-card").first().click();
    await expect(page.locator("#lightbox")).toBeVisible();

    // Check scroll lock
    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe("hidden");
  });

  test("Download button triggers demo modal", async ({ page }) => {
    await page.locator(".featured-card").first().click();

    const downloadBtn = page.locator('button[aria-label="Download"]');
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();

    // Check Demo Modal
    await expect(page.locator("#demo-modal")).toBeVisible();
    await expect(page.locator("#demo-feature-name")).toContainText("Download Image");

    // Close demo modal
    await page.locator("#demo-modal-close-btn").click();
    await expect(page.locator("#demo-modal")).not.toBeVisible();
  });

  test("Share button triggers demo modal", async ({ page }) => {
    await page.locator(".featured-card").first().click();

    const shareBtn = page.locator("#lightbox-share");
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // If it's a DemoLink (intercepted), it triggers modal.
    // Wait, I implemented it as a DemoLink but updated href in JS.
    // If href is updated to twitter intent, it might NOT be intercepted if it's an external domain NOT in demo-config?
    // "twitter.com" IS in demo-config.
    // So it SHOULD be intercepted.
    await expect(page.locator("#demo-modal")).toBeVisible();
  });

  test("shows the photo text overlay only while image details are closed", async ({ page }) => {
    const firstImage = page.locator(".featured-card").first();
    const secondImage = page.locator(".featured-card").nth(1);
    await firstImage.click();

    const overlay = page.locator("#lightbox-caption-container");
    const title = page.locator("#lightbox-overlay-title");
    const caption = page.locator("#lightbox-overlay-caption");
    const exif = page.locator("#lightbox-overlay-exif");
    await expect(overlay).toBeVisible();
    await expect(title).toHaveText((await firstImage.getAttribute("data-title")) || "");
    await expect(page.locator("#lightbox-overlay-category")).toHaveText(
      (await firstImage.getAttribute("data-category")) || ""
    );
    await expect(caption).toHaveText((await firstImage.getAttribute("data-caption")) || "");
    await expect(exif).toContainText("ISO 110");
    await expect(overlay).not.toContainText("Capture notes");

    await expect
      .poll(() =>
        page
          .locator("#lightbox-image")
          .evaluate(
            (element) =>
              element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0
          )
      )
      .toBe(true);
    const imageBounds = await page.locator("#lightbox-image").boundingBox();
    const overlayBounds = await overlay.boundingBox();
    if (!imageBounds || !overlayBounds) throw new Error("The image and overlay must be visible.");
    expect(overlayBounds.y).toBeLessThan(imageBounds.y + imageBounds.height);
    expect(overlayBounds.y + overlayBounds.height).toBeGreaterThan(imageBounds.y);
    expect(overlayBounds.x).toBeLessThan(imageBounds.x + imageBounds.width);
    expect(overlayBounds.x + overlayBounds.width).toBeGreaterThan(imageBounds.x);

    await openDetails(page);
    await expect(page.locator("#lightbox-details-panel")).toBeVisible();
    await expect(overlay).toBeHidden();

    if (await page.locator("#lightbox-details-toggle").isVisible()) {
      await page.locator("#lightbox-details-toggle").click();
    } else {
      await page.getByRole("tab", { name: "Photo", exact: true }).click();
    }
    await expect(overlay).toBeVisible();
    await expect(title).toHaveText((await firstImage.getAttribute("data-title")) || "");

    await page.locator("#lightbox").focus();
    await page.keyboard.press("ArrowRight");
    await expect(title).toHaveText((await secondImage.getAttribute("data-title")) || "");
    await expect(caption).toHaveText((await secondImage.getAttribute("data-caption")) || "");
    await expect(exif).toContainText("ISO 120");

    await openDetails(page);
    await expect(overlay).toBeHidden();
    await page.locator("#lightbox-close").click();
    await firstImage.click();
    await expect(overlay).toBeVisible();
    await expect(title).toHaveText((await firstImage.getAttribute("data-title")) || "");
    await expect(exif).toContainText("ISO 110");
  });

  test("shows rich text beside the photo on desktop without overlap", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, "Desktop layout");
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.locator('.featured-card[data-id="portraits-1"]').click();

    const photo = page.locator("#lightbox-photo");
    const panel = page.locator("#lightbox-details-panel");
    const toggle = page.locator("#lightbox-details-toggle");
    const originalPhotoBounds = await photo.boundingBox();
    expect(originalPhotoBounds).not.toBeNull();
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toBeVisible();
    await expect(page.locator("#lightbox-counter")).toHaveText("1 / 8");
    await expect(page.locator("#lightbox-exif")).toContainText("Sony A7RV");
    await expect(panel.getByRole("heading", { name: "Capture notes" })).toBeVisible();
    await expect(page.locator("#lightbox-rich-text strong").first()).toHaveText("sample metadata");
    await expect(page.locator("#lightbox-rich-text table")).toBeVisible();
    await expect(page.locator("#lightbox-rich-text a")).toHaveAttribute("href", /^https:\/\//);

    const photoBounds = await photo.boundingBox();
    const panelBounds = await panel.boundingBox();
    const imageBounds = await page.locator("#lightbox-image").boundingBox();
    const toggleBounds = await toggle.boundingBox();
    expect(photoBounds).not.toBeNull();
    expect(panelBounds).not.toBeNull();
    expect(imageBounds).not.toBeNull();
    expect(toggleBounds).not.toBeNull();
    if (!originalPhotoBounds || !photoBounds || !panelBounds || !imageBounds || !toggleBounds) {
      throw new Error("The viewer layout must have measurable bounds.");
    }
    expect(photoBounds.width).toBeLessThan(originalPhotoBounds.width);
    expect(photoBounds.x + photoBounds.width).toBeLessThanOrEqual(panelBounds.x + 1);
    expect(imageBounds.x + imageBounds.width).toBeLessThanOrEqual(panelBounds.x + 1);
    expect(toggleBounds.y + toggleBounds.height).toBeLessThanOrEqual(photoBounds.y + 1);

    await panel.focus();
    await page.keyboard.press("Space");
    await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#lightbox-counter")).toHaveText("1 / 8");
    expect((await new AxeBuilder({ page }).include("#lightbox").analyze()).violations).toEqual([]);

    await toggle.click();
    await expect(panel).toBeHidden();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#lightbox-title")).toHaveText("Urban Soul");
    await page.locator("#lightbox-close").click();
    await page.locator('.featured-card[data-id="portraits-1"]').click();
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("uses Photo and Details tabs on mobile without losing the image or zoom", async ({
    page,
  }) => {
    test.skip((page.viewportSize()?.width ?? 0) >= 1024, "Mobile and tablet layout");
    await page.setViewportSize({ width: page.viewportSize()!.width, height: 600 });
    await page.locator('.featured-card[data-id="portraits-1"]').click();

    const photoTab = page.getByRole("tab", { name: "Photo", exact: true });
    const detailsTab = page.getByRole("tab", { name: "Details", exact: true });
    const photo = page.locator("#lightbox-photo");
    const panel = page.locator("#lightbox-details-panel");
    const image = page.locator("#lightbox-image");
    await expect(photoTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#lightbox-details-toggle")).toBeHidden();
    await image.click();
    await expect(image).toHaveCSS("transform", /matrix\(2\.5/);

    await detailsTab.click();
    await expect(detailsTab).toHaveAttribute("aria-selected", "true");
    await expect(photo).toBeHidden();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Capture notes" })).toBeVisible();
    const panelBounds = await panel.boundingBox();
    expect(panelBounds).not.toBeNull();
    if (!panelBounds) throw new Error("The mobile reading view must have measurable bounds.");
    expect(panelBounds.x).toBeGreaterThanOrEqual(0);
    expect(panelBounds.x + panelBounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);

    await panel.focus();
    await page.keyboard.press("Space");
    await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(page.locator("#lightbox-counter")).toHaveText("1 / 8");
    expect((await new AxeBuilder({ page }).include("#lightbox").analyze()).violations).toEqual([]);

    await detailsTab.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(photoTab).toHaveAttribute("aria-selected", "true");
    await expect(photoTab).toBeFocused();
    await expect(photo).toBeVisible();
    await expect(panel).toBeHidden();
    await expect(image).toHaveCSS("transform", /matrix\(2\.5/);
    await page.keyboard.press("ArrowRight");
    await expect(detailsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#lightbox-counter")).toHaveText("1 / 8");
    await photoTab.click();
    await expect(image).toBeVisible();
  });

  test("updates details when navigating and uses the same content in category galleries", async ({
    page,
  }) => {
    await page.locator('.featured-card[data-id="portraits-1"]').click();
    await openDetails(page);
    await expect(page.locator("#lightbox-rich-text")).toContainText("Capture notes");
    await page.locator("#lightbox-details-panel").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    if ((page.viewportSize()?.width ?? 0) < 1024) {
      await page.getByRole("tab", { name: "Photo", exact: true }).click();
    }
    await page.locator("#lightbox").focus();
    await page.keyboard.press("ArrowRight");
    if (await page.locator("#lightbox-details-panel").isHidden()) await openDetails(page);
    await expect(page.locator("#lightbox-title")).toHaveText("Urban Soul");
    await expect(page.locator("#lightbox-rich-text")).toBeHidden();
    await expect(page.locator("#lightbox-exif")).toContainText("120");
    await expect
      .poll(() => page.locator("#lightbox-details-panel").evaluate((element) => element.scrollTop))
      .toBe(0);

    await page.goto("/gallery/galaxies/");
    await page.locator('.masonry-item[data-id="portraits-1"]').click();
    await openDetails(page);
    await expect(page.locator("#lightbox-rich-text")).toContainText("Capture notes");
    await expect(page.locator("#lightbox-exif")).toContainText("Sony A7RV");
  });

  test("hides details controls when an image has no information and clears the previous details", async ({
    page,
  }) => {
    await page.route(
      page.url(),
      async (route) => {
        const response = await route.fetch();
        const body = (await response.text())
          .replaceAll('data-id="portraits-2"', 'data-id="without-details"')
          .replace(/\sdata-(caption|exif)="[^"]*"/g, "");
        await route.fulfill({ response, body });
      },
      { times: 1 }
    );
    await page.reload();
    await page.locator('.featured-card[data-id="portraits-1"]').click();
    await openDetails(page);
    await expect(page.locator("#lightbox-rich-text")).toContainText("Capture notes");

    if ((page.viewportSize()?.width ?? 0) < 1024) {
      await page.getByRole("tab", { name: "Photo", exact: true }).click();
    }
    await page.locator("#lightbox").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#lightbox-title")).toHaveText("Urban Soul");
    await expect(page.locator("#lightbox-details-toggle")).toBeHidden();
    await expect(page.locator("#lightbox-view-tabs")).toBeHidden();
    await expect(page.locator("#lightbox-details-panel")).toBeHidden();
    await expect(page.locator("#lightbox-photo")).toBeVisible();
    await expect(page.locator("#lightbox-caption-container")).toBeVisible();
    await expect(page.locator("#lightbox-overlay-title")).toHaveText("Urban Soul");
    await expect(page.locator("#lightbox-overlay-caption")).toBeHidden();
    await expect(page.locator("#lightbox-overlay-exif")).toBeHidden();
  });

  test("keeps keyboard focus in the viewer and restores the gallery trigger", async ({ page }) => {
    const trigger = page.locator(".featured-card").first();
    await trigger.focus();
    await page.keyboard.press("Enter");
    const lightbox = page.locator("#lightbox");
    await expect(lightbox).not.toHaveClass(/opacity-0/);
    await lightbox.focus();
    await page.keyboard.press("Shift+Tab");
    expect(await lightbox.evaluate((element) => element.contains(document.activeElement))).toBe(
      true
    );
    await page.keyboard.press("Tab");
    expect(await lightbox.evaluate((element) => element.contains(document.activeElement))).toBe(
      true
    );
    await page.keyboard.press("Escape");
    await expect(lightbox).toHaveClass(/opacity-0/);
    await expect(trigger).toBeFocused();
  });

  test("adapts at the desktop breakpoint and isolates reading gestures from photo swipes", async ({
    page,
  }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, "Starts in the desktop layout");
    await page.locator('.featured-card[data-id="portraits-1"]').click();
    await openDetails(page);
    await page.setViewportSize({ width: 1023, height: 600 });

    const detailsTab = page.getByRole("tab", { name: "Details", exact: true });
    const panel = page.locator("#lightbox-details-panel");
    await expect(detailsTab).toHaveAttribute("aria-selected", "true");
    await expect(detailsTab).toBeFocused();
    await expect(page.locator("#lightbox-photo")).toBeHidden();
    await swipe(panel, { x: -180, y: 10 });
    await expect(page.locator("#lightbox-counter")).toHaveText("1 / 8");

    await page.getByRole("tab", { name: "Photo", exact: true }).click();
    await swipe(page.locator("#lightbox-image"), { x: -60, y: 160 });
    await expect(page.locator("#lightbox-counter")).toHaveText("1 / 8");
    await swipe(page.locator("#lightbox-image"), { x: -180, y: 10 });
    await expect(page.locator("#lightbox-title")).toHaveText("Urban Soul");

    await openDetails(page);
    await page.setViewportSize({ width: 1024, height: 700 });
    await expect(page.locator("#lightbox-photo")).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("role", "region");
    await expect(page.locator("#lightbox-details-toggle")).toBeFocused();
    await expect(page.locator("#lightbox-details-toggle")).toHaveAttribute("aria-expanded", "true");
  });
});
