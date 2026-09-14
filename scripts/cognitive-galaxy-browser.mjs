// Deterministic production UI acceptance for the offline-safe demo path.
// Live Zhihu retrieval/question_answers behavior is covered by API/unit tests.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const out = path.resolve(process.env.GALAXY_SCREENSHOTS || "test-artifacts/galaxy");
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "zh-CN" });
await context.addInitScript(() => localStorage.setItem("cognitive-galaxy:intro:v2", "ci-skip"));
const page = await context.newPage();
const errors = [];
page.setDefaultTimeout(20000);
page.on("pageerror", (error) => {
  const detail = `${page.url()} :: ${error.message}`;
  console.error("[pageerror]", detail);
  errors.push(detail);
});
const open = async (url) => {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  return response;
};
const capture = (name) => page.screenshot({ path: path.join(out, name), fullPage: true });

async function isolateProductUi() {
  await page.addStyleTag({ content: ".eazo-handoff-root{display:none!important;pointer-events:none!important}" }).catch(() => {});
}

try {
  // Home → demo recovery → lost-universe question network.
  await open("http://localhost:3000/");
  await isolateProductUi();
  const demos = page.locator('[data-el^="enter-demo-"]');
  await demos.first().waitFor();
  assert.equal(await demos.count(), 4);
  await capture("01-home.png");

  await demos.first().click({ force: true });
  await isolateProductUi();
  await page.locator('[data-el="lost-universe-network"]').waitFor();
  assert.equal(await page.locator('[data-el="core-question-galaxy"]').count(), 1);
  assert.equal(await page.locator('[data-el="related-question-galaxy"]').count(), 5);
  await capture("02-question-network.png");

  // Question galaxy → opinion galaxy.
  await page.locator('[data-el="core-question-galaxy"]').click({ force: true });
  await page.locator('[data-el="galaxy-cluster"]').first().waitFor();
  assert.equal(await page.locator('[data-el="galaxy-cluster"]').count(), 6);
  assert.equal(await page.locator('[data-el="opinion-planet"]').count(), 48);
  await capture("03-overview.png");

  await page.locator('[data-el="cluster-shortcut"]').first().click({ force: true });
  await page.locator('[data-el="opinion-shortcut"]').first().waitFor();
  assert.equal(await page.locator('[data-el="opinion-shortcut"]').count(), 8);
  await capture("04-cluster.png");

  // Opinion → law-mapping planet interior → persistent exit/Escape.
  await page.locator('[data-el="opinion-shortcut"]').first().click({ force: true });
  await page.locator('[data-el="planet-focus"]').waitFor();
  await capture("05-focus.png");
  await page.locator('[data-el="land-planet"]').click({ force: true });
  await page.waitForURL(/\/world\//);
  await isolateProductUi();
  await page.locator('[data-el="dynamic-planet-story-v5"]').waitFor();
  await page.locator('[data-el="exit-planet"]').waitFor();
  assert.ok(await page.getByText(/PLANET INTERIOR · 01 \/ 06/).count());
  await page.keyboard.press("Escape");
  await page.locator('[data-el="planet-focus"]').waitFor();

  // Invalid view params remain safe.
  await open("http://localhost:3000/galaxy/demo-luoci?cluster=bogus&opinion=bogus");
  await page.locator('[data-el="galaxy-cluster"]').first().waitFor();

  // Mobile: home → question network → opinion galaxy → focus without overflow.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await open("http://localhost:3000/");
  await isolateProductUi();
  const mobileDemo = page.locator('[data-el^="enter-demo-"]').first();
  await mobileDemo.waitFor();
  await capture("06-mobile-home.png");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mobileDemo.click({ force: true });
  await page.locator('[data-el="lost-universe-network"]').waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('[data-el="core-question-galaxy"]').click({ force: true });
  await page.locator('[data-el="cluster-shortcut"]').first().waitFor();
  await capture("07-mobile-overview.png");
  await page.locator('[data-el="cluster-shortcut"]').first().click({ force: true });
  await page.locator('[data-el="opinion-shortcut"]').first().click({ force: true });
  await page.locator('[data-el="planet-focus"]').waitFor();
  await capture("08-mobile-focus.png");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(out, "result.json"), JSON.stringify({
    ok: true,
    pageErrors: errors,
    checks: [
      "four homepage demos",
      "demo question network",
      "question-question relations",
      "48 opinion planets",
      "6 clusters",
      "8 viewpoints per cluster",
      "scientific-law planet story",
      "exit planet",
      "invalid view query",
      "mobile overflow",
      "reduced motion",
    ],
  }, null, 2));
} catch (error) {
  const detail = { ok: false, url: page.url(), message: String(error), pageErrors: errors };
  console.error(JSON.stringify(detail));
  await fs.writeFile(path.join(out, "failure.json"), JSON.stringify(detail, null, 2));
  await page.screenshot({ path: path.join(out, "failure.png"), fullPage: true }).catch(() => {});
  await fs.writeFile(path.join(out, "failure.html"), await page.content()).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
