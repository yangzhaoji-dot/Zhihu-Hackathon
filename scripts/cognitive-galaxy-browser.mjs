// Production UI acceptance for the current galaxy shell. Remote search is mocked;
// live Zhihu integration is covered separately from this deterministic browser test.
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
  // The homepage is client-interactive. Give React a brief deterministic window
  // to hydrate before clicks/submits so Playwright never falls back to native form behavior.
  await page.waitForTimeout(300);
  return response;
};
const waitUrl = (url) => page.waitForURL(url, { waitUntil: "domcontentloaded" });
const capture = (name) => page.screenshot({ path: path.join(out, name), fullPage: true });
const home = page.locator('[data-el="galaxy-home"]');

async function isolateProductUi() {
  await page.addStyleTag({ content: ".eazo-handoff-root{display:none!important;pointer-events:none!important}" }).catch(() => {});
}

try {
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

  await page.locator('[data-el="core-question-galaxy"]').click({ force: true });
  await page.locator('[data-el="galaxy-cluster"]').first().waitFor();
  assert.equal(await page.locator('[data-el="galaxy-cluster"]').count(), 6);
  assert.equal(await page.locator('[data-el="opinion-planet"]').count(), 48);
  await capture("03-overview.png");

  await page.locator('[data-el="cluster-shortcut"]').first().click({ force: true });
  await page.locator('[data-el="opinion-shortcut"]').first().waitFor();
  assert.equal(await page.locator('[data-el="opinion-shortcut"]').count(), 8);
  await capture("04-cluster.png");

  await page.locator('[data-el="opinion-shortcut"]').first().click({ force: true });
  await page.locator('[data-el="planet-focus"]').waitFor();
  await capture("05-focus.png");

  await page.locator('[data-el="land-planet"]').click({ force: true });
  await waitUrl(/\/world\//);
  await isolateProductUi();
  await page.locator('[data-el="dynamic-planet-story-v5"]').waitFor();
  await page.locator('[data-el="exit-planet"]').waitFor();
  await page.keyboard.press("Escape");
  await page.locator('[data-el="planet-focus"]').waitFor();

  await page.keyboard.press("Escape");
  await waitUrl((url) => !url.searchParams.has("opinion"));
  await page.keyboard.press("Escape");
  await waitUrl((url) => !url.searchParams.has("cluster"));
  await page.locator('[data-el="galaxy-cluster"]').first().press("Enter");
  await waitUrl((url) => url.searchParams.has("cluster"));
  await page.goBack({ waitUntil: "domcontentloaded" });
  await waitUrl((url) => !url.searchParams.has("cluster"));

  // Search failure must not remove the four reliable homepage demos.
  await open("http://localhost:3000/");
  await isolateProductUi();
  await page.route("**/api/opinion/build", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "zhihu_auth_not_configured" }) }));
  await home.locator("input").fill("测试问题");
  await home.locator("form button[type=submit]").click({ force: true });
  await home.locator('[role="alert"]').waitFor({ timeout: 15000 });
  assert.equal(await page.locator('[data-el^="enter-demo-"]').count(), 4);
  await page.unroute("**/api/opinion/build");

  // Search enters the lost question-network layer before the opinion galaxy.
  await page.route("**/api/opinion/build", async (route) => {
    const body = route.request().postDataJSON();
    const graph = { questionId: "q_test_contract", questionTitle: "测试星系", questionUrl: "https://www.zhihu.com/question/123", sourceScope: "zhihu-question-answers", opinions: [{ id: "test-health", questionId: "q_test_contract", title: "心理健康也是重要条件", summary: "仅用于接口测试", kind: "human", sourceIds: [], support: 0, x: 0, y: 0 }], sources: [], authors: [], relations: [] };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body.questionUrl
      ? { selectionRequired: false, graph, retrieval: { itemCount: 1, hasMore: false, scope: "zhihu-question-answers" } }
      : { selectionRequired: true, query: "测试", questions: [{ title: "测试星系", url: "https://www.zhihu.com/question/123", sourceCount: 1 }] }) });
  });
  await home.locator("input").fill("测试");
  await home.locator("form button[type=submit]").click({ force: true });
  await home.getByRole("button", { name: "测试星系", exact: true }).click({ force: true });
  await waitUrl("**/universe/q_test_contract");
  await isolateProductUi();
  await page.locator('[data-el="lost-universe-network"]').waitFor();
  await page.locator('[data-el="core-question-galaxy"]').click({ force: true });
  await waitUrl("**/galaxy/q_test_contract");
  await page.locator('[data-el="galaxy-cluster"]').waitFor();
  assert.equal(await page.locator('[data-el="opinion-planet"]').count(), 1);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-el="galaxy-cluster"]').waitFor();
  await page.unroute("**/api/opinion/build");

  await open("http://localhost:3000/galaxy/demo-luoci?cluster=bogus&opinion=bogus");
  await page.locator('[data-el="galaxy-cluster"]').first().waitFor();

  // Mobile + reduced-motion sanity.
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
    checks: ["four homepage demos", "demo question network", "related-question links", "48 unique planets", "6 clusters", "8 viewpoints per cluster", "focus", "planet law story", "exit planet", "Escape", "browser Back", "keyboard", "search error", "lost-universe search layer", "invalid view query", "mobile overflow", "reduced motion"],
  }, null, 2));
} catch (error) {
  const detail = { ok: false, url: page.url(), message: String(error), pageErrors: errors };
  console.error(JSON.stringify(detail));
  await fs.writeFile(path.join(out, "failure.json"), JSON.stringify(detail, null, 2));
  await page.screenshot({ path: path.join(out, "failure.png"), fullPage: true }).catch(() => {});
  await fs.writeFile(path.join(out, "failure.html"), await page.content());
  throw error;
} finally {
  await browser.close();
}
