import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const out = path.resolve(process.env.UNIVERSE_SCREENSHOTS || "test-artifacts/universe");
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "zh-CN" });
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const shot = (name) => page.screenshot({ path: path.join(out, name), fullPage: true });

async function isolateProductUi() {
  await page.addStyleTag({ content: ".eazo-handoff-root{display:none!important;pointer-events:none!important}" }).catch(() => {});
}

async function openDemoPlanet(galaxyId, cluster, opinionId, expectedCount) {
  await page.goto(`http://localhost:3000/galaxy/${galaxyId}?cluster=${cluster}&opinion=${opinionId}`, { waitUntil: "domcontentloaded" });
  await isolateProductUi();
  await page.locator('[data-el="planet-focus"]').waitFor();
  assert.equal(await page.locator('[data-el="opinion-planet"]').count(), expectedCount);
  await page.locator('[data-el="land-planet"]').click({ force: true });
  await page.waitForURL(/\/world\//);
  await isolateProductUi();
  await page.locator('[data-el="dynamic-planet-story-v5"]').waitFor();
  await page.getByText(/PLANET INTERIOR · 01 \/ 06/).waitFor();
}

async function advanceStoryToArchive() {
  for (let i = 0; i < 5; i += 1) {
    await page.getByRole("button", { name: /下一页/ }).click({ force: true });
    await page.waitForTimeout(430);
  }
  await page.getByText(/ECHO ARCHIVE · 人类证据/).waitFor();
}

try {
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  await isolateProductUi();
  await page.locator('[data-el^="enter-demo-"]').first().waitFor();
  assert.equal(await page.locator('[data-el^="enter-demo-"]').count(), 4);
  assert.ok(await page.getByText("年轻人，到底该不该裸辞？").count());
  assert.ok(await page.getByText("AI 会取代程序员吗？").count());
  assert.ok(await page.getByText("读研真的值得吗？").count());
  assert.ok(await page.getByText("大学应该卷绩点还是做项目").count());
  await shot("01-home-four-demos.png");

  await openDemoPlanet("demo-luoci", "health", "demo-health-0", 48);
  assert.ok(await page.getByText(/ẋ = r \+ x²|科学|方程/).count());
  await shot("02-planet-page-01.png");
  await advanceStoryToArchive();
  assert.ok(await page.getByText(/没有绑定真实知乎来源/).count());
  assert.equal(await page.locator('a').filter({ hasText: /原回答/ }).count(), 0);
  await shot("03-demo-archive-boundary.png");

  await page.getByRole("button", { name: /返回主星系/ }).click({ force: true });
  await page.waitForURL((url) => url.pathname.endsWith("/galaxy/demo-luoci") && url.searchParams.get("opinion") === "demo-health-0");
  await isolateProductUi();
  await page.locator('[data-el="planet-focus"]').waitFor();
  await page.locator('[data-el="planet-focus"] button[aria-label]').first().click({ force: true });
  await page.locator('[data-level="cluster"]').waitFor();

  const selectors = page.locator('[data-el="collision-select"]');
  assert.ok(await selectors.count() >= 2);
  await selectors.nth(0).click({ force: true });
  await selectors.nth(1).click({ force: true });
  await page.locator('[data-el="collision-panel"]').waitFor();
  await page.getByRole("button", { name: /分析观点碰撞/ }).click({ force: true });
  const collision = page.locator('[data-el="collision-analysis"]');
  await collision.waitFor();
  // Collision is API-first in production and deterministic-fallback in offline CI.
  // Validate the rendered result contract instead of pinning the test to fallback copy.
  assert.ok((await collision.locator("section").count()) >= 4);
  assert.ok((await collision.locator("h3").innerText()).trim().length > 0);
  await shot("04-demo-collision.png");
  await page.locator('[data-el="fuse-planets"]').click({ force: true });
  await page.waitForURL((url) => (url.searchParams.get("opinion") || "").startsWith("fusion_"), { timeout: 8000 });
  await isolateProductUi();
  await page.locator('[data-el="planet-focus"]').waitFor();
  await shot("05-demo-fusion.png");

  await page.locator('[data-el="reset-galaxy"]').click({ force: true });
  await page.waitForURL((url) => url.pathname.endsWith("/galaxy/demo-luoci") && !url.searchParams.has("cluster"));
  assert.equal(await page.locator('[data-el="opinion-planet"]').count(), 48);

  const others = [
    ["demo-ai-programmers", "growth", "demo-ai-growth-0", 24],
    ["demo-study-value", "growth", "demo-study-growth-0", 24],
    ["demo-grade-project", "growth", "demo-grade-growth-0", 24],
  ];
  for (const [galaxyId, cluster, opinionId, count] of others) {
    await openDemoPlanet(galaxyId, cluster, opinionId, count);
    assert.ok(await page.getByText(/观点星球/).count());
    await page.getByRole("button", { name: /返回主星系/ }).click({ force: true });
    await page.waitForURL((url) => url.pathname.endsWith(`/galaxy/${galaxyId}`) && url.searchParams.get("opinion") === opinionId);
    await isolateProductUi();
    await page.locator('[data-el="planet-focus"]').waitFor();
  }
  await shot("06-other-home-demos.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3000/world/demo-grade-growth-0?galaxy=demo-grade-project&origin=demo-grade-growth-0&cluster=growth", { waitUntil: "domcontentloaded" });
  await isolateProductUi();
  await page.locator('[data-el="dynamic-planet-story-v5"]').waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await shot("07-mobile-planet-story.png");
  assert.deepEqual(errors, []);

  await fs.writeFile(path.join(out, "result.json"), JSON.stringify({
    ok: true,
    checks: ["four homepage demos", "six-page planet story", "demo source honesty", "return focus", "API-first collision with offline fallback", "fusion", "reset", "three additional demos", "mobile overflow"],
    pageErrors: errors,
  }, null, 2));
} catch (error) {
  const detail = { ok: false, url: page.url(), message: String(error), pageErrors: errors };
  console.error(JSON.stringify(detail));
  await fs.writeFile(path.join(out, "failure.json"), JSON.stringify(detail, null, 2));
  await page.screenshot({ path: path.join(out, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
