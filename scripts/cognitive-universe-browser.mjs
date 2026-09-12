import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const out = path.resolve(process.env.UNIVERSE_SCREENSHOTS || "test-artifacts/universe");
await fs.mkdir(out,{recursive:true});
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({viewport:{width:1440,height:1000},locale:"zh-CN"});
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
const shot=(name)=>page.screenshot({path:path.join(out,name),fullPage:true});

async function selectText(locator, start, end) {
  await locator.evaluate((el,{start,end})=>{
    const textNode=el.firstChild;
    if(!textNode) throw new Error("missing text node");
    const range=document.createRange();
    range.setStart(textNode,start);
    range.setEnd(textNode,Math.min(end,textNode.textContent?.length||end));
    const selection=window.getSelection();
    selection?.removeAllRanges(); selection?.addRange(range);
    el.dispatchEvent(new MouseEvent("mouseup",{bubbles:true}));
  },{start,end});
}

try {
  await page.goto("http://localhost:3000/galaxy/demo-luoci?cluster=health&opinion=demo-health-0",{waitUntil:"domcontentloaded"});
  await page.locator('[data-el="planet-focus"]').waitFor();
  await page.locator('[data-el="land-planet"]').click();
  await page.waitForURL(/\/world\/o_stoploss\?/);
  await page.locator('[data-el="planet-synthesis-mvp"]').waitFor();
  assert.ok(await page.locator('[data-el="planet-material"]').count() >= 2);
  await shot("01-planet-reader.png");

  const excerpts=page.locator('[data-el="selectable-excerpt"]');
  await selectText(excerpts.nth(0),0,18);
  await page.locator('[data-el="keep-excerpt"]').click();
  await selectText(excerpts.nth(1),0,18);
  await page.locator('[data-el="keep-excerpt"]').click();

  await page.route("**/api/opinion/synthesize",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,result:{
    viewpoint:"身心损耗需要止损，但离开也要同时管理后续风险。",
    summary:"用户选择的两段材料同时强调损耗与条件，因此观点不再是无条件离开。",
    relation:"revision",action:"fork",reason:"保留止损核心，同时加入条件约束。",
    additions:["加入后续风险条件"],gaps:["长期结果仍不足"],
    scores:{grounding:92,coherence:88,specificity:86,boundary:84,novelty:78,overall:87},provider:"mock"
  }})}));
  await page.locator('[data-el="generate-viewpoint"]').click();
  await page.locator('[data-el="synthesis-result"]').waitFor();
  await shot("02-synthesis-result.png");
  await page.getByRole("button",{name:"预览新星球"}).click();
  await page.locator('[data-el="evolution-preview"]').waitFor();
  await page.getByRole("button",{name:"生成新星球"}).click();
  await page.waitForURL(url=>url.pathname.includes("/galaxy/demo-luoci") && (url.searchParams.get("opinion")||"").startsWith("user_"));
  await page.locator('[data-el="planet-focus"]').waitFor();
  assert.match(await page.locator('[data-el="planet-focus"] h2').innerText(),/身心损耗/);
  const forkUrl=page.url();
  const evolvedId=new URL(forkUrl).searchParams.get("opinion");
  assert.ok(evolvedId?.startsWith("user_"));
  await page.reload({waitUntil:"domcontentloaded"});
  await page.locator('[data-el="planet-focus"]').waitFor();
  assert.equal(page.url(),forkUrl);
  await shot("03-evolved-galaxy.png");
  await page.unroute("**/api/opinion/synthesize");

  // A generated planet is not decorative: it can be entered again using the
  // source excerpts persisted in the current session graph.
  await page.locator('[data-el="land-planet"]').click();
  await page.waitForURL(url=>url.pathname.includes(`/world/${evolvedId}`));
  await page.locator('[data-el="planet-synthesis-mvp"]').waitFor();
  assert.ok(await page.locator('[data-el="planet-material"]').count() >= 1);
  await page.getByRole("button",{name:/返回主星系/}).click();
  await page.locator('[data-el="planet-focus"]').waitFor();

  await page.locator('[data-el="planet-focus"] button[aria-label]').first().click();
  await page.locator('[data-el="collision-select"]').nth(0).click();
  await page.locator('[data-el="collision-select"]').nth(1).click();
  await page.route("**/api/opinion/collide",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,analysis:{
    consensus:"都承认选择存在真实成本。",coreDisagreement:"两者对哪一种成本更优先有不同判断。",
    conditions:{a:"身心损耗明显",b:"经济压力可控"},
    evidence:{a:"经验材料",b:"风险材料",verdict:"两类材料互补，暂不能互相替代。"},
    missing:["长期结果"],candidate:{title:"把退出成本与持续损耗一起比较",summary:"不要只看离开的成本，也比较继续留下的成本。"},source:"ai"
  }})}));
  await page.getByRole("button",{name:/分析观点碰撞/}).click();
  await page.locator('[data-el="collision-analysis"]').waitFor();
  await shot("04-collision.png");
  await page.locator('[data-el="fuse-planets"]').click();
  await page.waitForURL(url=>(url.searchParams.get("opinion")||"").startsWith("fusion_"));
  await page.locator('[data-el="planet-focus"]').waitFor();
  assert.match(await page.locator('[data-el="planet-focus"] h2').innerText(),/退出成本/);
  await page.unroute("**/api/opinion/collide");

  await page.locator('[data-el="reset-galaxy"]').click();
  await page.waitForURL(url=>url.pathname.endsWith("/galaxy/demo-luoci") && !url.searchParams.has("cluster"));
  await page.locator('[data-el="opinion-planet"]').first().waitFor();
  assert.equal(await page.locator('[data-el="opinion-planet"]').count(),48);
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,"result.json"),JSON.stringify({ok:true,checks:["demo landing route","grounded text selection","synthesis","fork persistence","generated planet re-entry","collision","fusion","demo reset"],pageErrors:errors},null,2));
} catch(error) {
  const detail={ok:false,url:page.url(),message:String(error),pageErrors:errors};
  console.error(JSON.stringify(detail));
  await fs.writeFile(path.join(out,"failure.json"),JSON.stringify(detail,null,2));
  await page.screenshot({path:path.join(out,"failure.png"),fullPage:true}).catch(()=>{});
  throw error;
} finally { await browser.close(); }
