import { test, expect } from "@playwright/test";
import { walkSmoke } from "./walk.mjs";

test("walking slice smoke", async ({ page }) => {
  await walkSmoke(page);
  await expect(page.getByRole("heading", { name: "Games" })).toBeVisible();
});
