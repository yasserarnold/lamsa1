import { test, expect } from "@playwright/test";

/**
 * Dev-time guard: /auth must render on the server and hydrate on the client
 * without any React hydration mismatch. Run before publishing:
 *   bun run check:hydration
 */
const HYDRATION_PATTERNS = [
  "Hydration failed",
  "didn't match",
  "did not match",
  "Text content does not match",
  "hydrating",
];

test("/auth hydrates without server/client DOM mismatch", async ({ page, request }) => {
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    const text = msg.text();
    if (HYDRATION_PATTERNS.some((p) => text.includes(p))) problems.push(text);
  });
  page.on("pageerror", (err) => {
    if (HYDRATION_PATTERNS.some((p) => err.message.includes(p))) problems.push(err.message);
  });

  // 1. The server must actually render the page (no ssr:false bail-out).
  const ssr = await request.get("/auth");
  expect(ssr.status()).toBe(200);
  const ssrHtml = await ssr.text();
  expect(ssrHtml).toContain("animate-pulse"); // loading skeleton is server-rendered

  // 2. The first client paint must match that server markup.
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");

  expect(problems, `Hydration mismatch on /auth:\n${problems.join("\n")}`).toEqual([]);

  // 3. After hydration the real form is present.
  await expect(page.locator("form")).toBeVisible();
});
