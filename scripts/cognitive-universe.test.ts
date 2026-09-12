import { describe, expect, test } from "bun:test";
import { evolveGraphFromSynthesis, fuseGalaxyOpinions } from "@/lib/cognitive-galaxy/evolution";
import type { OpinionGraph } from "@/lib/opinion/types";
import type { PlanetSynthesisResult } from "@/lib/planet-synthesis/model";

const graph: OpinionGraph = {
  questionId: "q",
  questionTitle: "测试问题",
  opinions: [
    { id:"a",questionId:"q",title:"原观点",summary:"原说明",kind:"human",support:1,x:.3,y:.4,sourceIds:["s1"] },
    { id:"b",questionId:"q",title:"另一个观点",summary:"另一说明",kind:"human",support:1,x:.7,y:.5,sourceIds:["s2"] },
  ],
  relations: [],
  authors: [
    { id:"u1",name:"A",title:"",credibility:80 },
    { id:"u2",name:"B",title:"",credibility:80 },
  ],
  sources: [
    { id:"s1",authorId:"u1",excerpt:"这是第一段足够长的原始材料。",upvotes:1,url:"https://www.zhihu.com/question/1/answer/1" },
    { id:"s2",authorId:"u2",excerpt:"这是第二段足够长的原始材料。",upvotes:1,url:"https://www.zhihu.com/question/1/answer/2" },
  ],
};

const result: PlanetSynthesisResult = {
  viewpoint:"加入边界后的新观点",
  summary:"材料共同说明原观点需要增加条件。",
  relation:"refinement",
  action:"merge",
  reason:"增加了成立边界",
  additions:["需要条件 X"],
  gaps:[],
  scores:{grounding:90,coherence:90,specificity:80,boundary:88,novelty:60,overall:84},
};

describe("cognitive universe evolution", () => {
  test("merge refines the same planet and preserves grounding", () => {
    const mutation = evolveGraphFromSynthesis({
      graph,
      parentId:"a",
      result,
      selections:[{sourceId:"s1",text:"第一段足够长的原始材料"}],
      action:"merge",
    });
    expect(mutation.opinionId).toBe("a");
    expect(mutation.graph.opinions).toHaveLength(2);
    const opinion = mutation.graph.opinions.find((item) => item.id === "a")!;
    expect(opinion.title).toBe(result.viewpoint);
    expect(opinion.claim).toBe("原观点");
    expect(opinion.evidence).toContain("第一段足够长的原始材料");
  });

  test("fork creates a grounded child and relation", () => {
    const mutation = evolveGraphFromSynthesis({
      graph,
      parentId:"a",
      result:{...result,relation:"revision",action:"fork"},
      selections:[{sourceId:"s1",text:"第一段足够长的原始材料"}],
      action:"fork",
      id:"user_test",
    });
    expect(mutation.opinionId).toBe("user_test");
    const child = mutation.graph.opinions.find((item) => item.id === "user_test")!;
    expect(child.derivedFrom).toEqual(["a"]);
    expect(child.sourceIds).toEqual(["s1"]);
    expect(mutation.graph.relations).toContainEqual(expect.objectContaining({from:"a",to:"user_test",type:"cond"}));
  });

  test("fusion creates a third planet with both parents and source sets", () => {
    const mutation = fuseGalaxyOpinions({graph,parentA:"a",parentB:"b",title:"融合观点",summary:"综合两个判断",id:"fusion_test"});
    const child = mutation.graph.opinions.find((item) => item.id === "fusion_test")!;
    expect(child.derivedFrom).toEqual(["a","b"]);
    expect(new Set(child.sourceIds)).toEqual(new Set(["s1","s2"]));
    expect(mutation.graph.relations.filter((item) => item.to === "fusion_test")).toHaveLength(2);
  });
});
