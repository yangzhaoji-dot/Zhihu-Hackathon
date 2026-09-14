import { describe, expect, test } from "bun:test";
import { buildGalaxy, hash, safeSourceUrl, classify, fitBounds } from "../src/lib/cognitive-galaxy/model";
import { DEMO_GRAPH, DEMO_ASSIGNMENTS } from "../src/lib/cognitive-galaxy/demo";
import { galaxyUrl, isOpinionGraph, readGalaxy } from "../src/lib/cognitive-galaxy/session";
import { parseQuestionAnswersPayload } from "../src/lib/opinion/zhihu-question-answers";
import zh from "../src/i18n/locales/galaxy.zh-CN.json";
import en from "../src/i18n/locales/galaxy.en-US.json";

describe("cognitive galaxy", () => {
  test("demo is explicitly labelled and has 48 distinct opinions in six directions", () => {
    const result=buildGalaxy(DEMO_GRAPH,DEMO_ASSIGNMENTS);
    expect(result.demo).toBe(true); expect(result.count).toBe(48); expect(result.clusters.length).toBe(6);
    expect(new Set(result.clusters.flatMap((g)=>g.nodes.map((n)=>n.opinion.id))).size).toBe(48);
    expect(DEMO_GRAPH.sources).toEqual([]);
  });
  test("layout is deterministic and independent of API opinion ordering", () => {
    const a=buildGalaxy(DEMO_GRAPH,DEMO_ASSIGNMENTS),b=buildGalaxy({...DEMO_GRAPH,opinions:[...DEMO_GRAPH.opinions].reverse()},DEMO_ASSIGNMENTS);
    expect(a.clusters).toEqual(b.clusters);
    expect(hash("稳定")).toBe(hash("稳定"));
  });
  test("no same-cluster planet bodies overlap; coordinates stay finite", () => {
    for(const c of buildGalaxy(DEMO_GRAPH,DEMO_ASSIGNMENTS).clusters){
      for(const a of c.nodes){
        expect(Number.isFinite(a.x+a.y+a.radius)).toBe(true);
        for(const b of c.nodes) if(a!==b) expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeGreaterThanOrEqual(a.radius+b.radius);
      }
    }
  });
  test("AI stations are not silently rendered as human opinions; duplicate ids deduplicate", () => {
    const base=DEMO_GRAPH.opinions[0];
    const result=buildGalaxy({...DEMO_GRAPH,opinions:[base,base,{...base,id:"AI",kind:"ai",nodeType:"station"}]});
    expect(result.count).toBe(1); expect(result.excludedCount).toBe(2);
  });
  test("only known, deduplicated source ids affect live sizes", () => {
    const base={...DEMO_GRAPH.opinions[0],sourceIds:["missing","missing"]};
    const result=buildGalaxy({...DEMO_GRAPH,sourceScope:"zhihu-question-answers",opinions:[base]});
    expect(result.clusters[0].nodes[0].sourceCount).toBe(0);
    expect(result.clusters[0].nodes[0].radius).toBe(5);
  });
  test("empty and singleton graphs remain valid", () => {
    expect(buildGalaxy({...DEMO_GRAPH,opinions:[]}).count).toBe(0);
    expect(fitBounds([{x:0,y:0}]).width).toBeGreaterThan(0);
  });
  test("no arbitrary camp label is treated as a perspective", () => {
    expect(classify({...DEMO_GRAPH.opinions[0],title:"abc",summary:"xyz",camp:"支持派"})).toBe("other");
  });
  test("source URLs reject script schemes, deceptive domains and demo placeholders", () => {
    expect(safeSourceUrl("javascript:alert(1)")).toBeNull();
    expect(safeSourceUrl("https://zhihu.com.evil.test/question/1")).toBeNull();
    expect(safeSourceUrl("https://www.zhihu.com/question/000/answer/1")).toBeNull();
    expect(safeSourceUrl("https://www.zhihu.com/question/123/answer/456")).not.toBeNull();
  });
  test("cache validation rejects malformed data; missing ids do not substitute the demo", () => {
    expect(isOpinionGraph(DEMO_GRAPH)).toBe(true);
    expect(isOpinionGraph({opinions:[]})).toBe(false);
    expect(isOpinionGraph({...DEMO_GRAPH,opinions:[null]})).toBe(false);
    expect(readGalaxy("not-a-demo")).toBeNull();
    expect(galaxyUrl("a/b","health","a?b")).toBe("/galaxy/a%2Fb?cluster=health&opinion=a%3Fb");
  });
  test("Chinese and English namespaces have identical keys", () => {
    const keys=(v:unknown,p=""):string[] => v && typeof v==="object" ? Object.entries(v).flatMap(([k,w])=>keys(w,`${p}.${k}`)) : [p];
    expect(keys(zh).sort()).toEqual(keys(en).sort());
  });

  test("official question_answers payload preserves summaries and paging", () => {
    const page=parseQuestionAnswersPayload({Code:0,Data:{Items:[
      {ContentType:"Answer",ContentToken:"a1",Url:"https://www.zhihu.com/question/123/answer/456",Summary:"真实回答摘要一"},
      {ContentType:"Answer",ContentToken:"a2",Url:"https://www.zhihu.com/question/123/answer/789",Summary:"真实回答摘要二"},
    ],Paging:{IsEnd:false,NextOffset:20,Totals:86}}});
    expect(page.items.map((item)=>item.ContentToken)).toEqual(["a1","a2"]);
    expect(page.isEnd).toBe(false); expect(page.nextOffset).toBe(20); expect(page.total).toBe(86);
  });

  test("question_answers filters unusable rows and exposes stable quota/auth errors", () => {
    const page=parseQuestionAnswersPayload({Code:0,Data:{Items:[
      {ContentToken:"missing-url",Summary:"没有链接"},
      {ContentToken:"empty",Url:"https://www.zhihu.com/answer/1",Summary:"  "},
      {ContentToken:"valid",Url:"https://www.zhihu.com/answer/2",Summary:"保留"},
    ],Paging:{IsEnd:true}}});
    expect(page.items.map((item)=>item.ContentToken)).toEqual(["valid"]);
    expect(()=>parseQuestionAnswersPayload({Code:30001})).toThrow("zhihu_rate_limited");
    expect(()=>parseQuestionAnswersPayload({Code:20001})).toThrow("zhihu_auth_failed");
  });
});