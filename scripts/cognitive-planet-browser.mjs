import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const out = path.resolve(process.env.PLANET_SCREENSHOTS || "test-artifacts/planet");
await fs.mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: "zh-CN" });
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

async function capture(name) {
  await page.screenshot({ path: path.join(out, name), fullPage: true });
}

async function selectText(locator, length = 18) {
  await locator.evaluate((el, selectionLength) => {
    const node = el.firstChild;
    if (!node || node.nodeType !== Node.TEXT_NODE) throw new Error("blockquote missing text node");
    const text = node.textContent || "";
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, Math.min(selectionLength, text.length));
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  }, length);
}

try {
  await page.route("**/api/opinion/synthesize", async (route) => {
    const body = route.request().postDataJSON();
    assert.equal(body.opinionId, "o_stoploss");
    assert.ok(Array.isArray(body.selections));
    assert.ok(body.selections.length >= 2);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        result: {
          viewpoint: "身心损耗严重时，离开具有止损价值，但经济缓冲会显著改变这个选择的风险。",
          summary: "所选材料同时体现了健康损耗、离开后的恢复，以及退出成本这一限制条件。",
          relation: "revision",
          action: "fork",
          reason: "新观点保留止损核心，但加入了原观点未充分表达的经济风险变量。",
          additions: ["经济缓冲会改变裸辞风险"],
          gaps: ["长期职业结果仍缺材料"],
          scores: { grounding: 93, coherence: 91, specificity: 88, boundary: 86, novelty: 78, overall: 89 },
          provider: "mock",
        },
      }),
    });
  });

  await page.goto("http://localhost:3000/world/o_stoploss", { waitUntil: "domcontentloaded" });
  await page.locator('[data-el="planet-synthesis-mvp"]').waitFor();
  const cards = page.locator("article").filter({ has: page.locator("blockquote") });
  assert.ok(await cards.count() >= 4);
  await page.waitForTimeout(500);
  await capture("01-planet-reader.png");

  const first = page.locator("article blockquote").nth(0);
  await selectText(first, 16);
  await page.getByRole("dialog", { name: "收下选中文本" }).waitFor();
  await page.getByRole("button", { name: /收下这段/ }).click();

  const second = page.locator("article blockquote").nth(2);
  await selectText(second, 20);
  await page.getByRole("dialog", { name: "收下选中文本" }).waitFor();
  await page.getByRole("button", { name: /收下这段/ }).click();

  await page.getByRole("button", { name: /形成我的观点/ }).click();
  await page.getByText("观点已经形成", { exact: true }).waitFor();
  await page.waitForTimeout(400);
  await capture("02-synthesis-result.png");
  await page.getByRole("button", { name: "预览新星球" }).click();
  await page.getByText("FORK PREVIEW", { exact: true }).waitFor();
  await capture("03-fork-preview.png");

  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(out, "result.json"), JSON.stringify({ ok: true, pageErrors: errors, checks: ["planet loads", "raw text selection", "excerpt tray", "synthesis request", "score rendering", "fork preview"] }, null, 2));
} catch (error) {
  const detail = { ok: false, url: page.url(), message: String(error), pageErrors: errors };
  console.error(JSON.stringify(detail));
  await fs.writeFile(path.join(out, "failure.json"), JSON.stringify(detail, null, 2));
  await page.screenshot({ path: path.join(out, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
