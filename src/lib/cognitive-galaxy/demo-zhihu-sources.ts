import type { Author, OpinionGraph, OpinionSource } from "@/lib/opinion/types";

type SourceSeed = {
  id: string;
  url: string;
  excerpt: string;
  dimensions: string[];
};

const SEEDS: Record<string, SourceSeed[]> = {
  "demo-luoci": [
    {
      id: "resign-health-money",
      url: "https://www.zhihu.com/question/450192648/answer/2014107853456187859",
      excerpt: "回答建议在裸辞前同时检查身心状态、家庭责任与现金流，并强调不同人的条件不能直接照搬。",
      dimensions: ["health", "resources", "context", "reasoning"],
    },
    {
      id: "resign-trial-error",
      url: "https://www.zhihu.com/question/19628805/answer/1543586063",
      excerpt: "回答把实习视为低成本试错，也提醒职业选择需要通过真实经历逐步校准，而不是一次押注。",
      dimensions: ["growth", "values", "context", "reasoning"],
    },
  ],
  "demo-ai-programmers": [
    {
      id: "ai-programmer-role",
      url: "https://www.zhihu.com/question/1962444467077358693/answer/2009650005263279828",
      excerpt: "回答认为 AI 更像编程能力的放大器，真正变化的是程序员的工作重心与能力要求。",
      dimensions: ["growth", "values", "reasoning"],
    },
    {
      id: "ai-programmer-workflow",
      url: "https://www.zhihu.com/question/1943057024997913208/answer/2025992292536787677",
      excerpt: "回答描述了开发者从亲自逐行编码，逐渐转向提出需求、审核结果和指挥代码生成的变化。",
      dimensions: ["resources", "context", "growth", "reasoning"],
    },
  ],
  "demo-study-value": [
    {
      id: "study-meaning",
      url: "https://www.zhihu.com/question/21139858/answer/1085492275",
      excerpt: "回答把读研的价值放在能力提升以及与工业界、学术界建立更深连接，而非只看起薪。",
      dimensions: ["growth", "values", "reasoning"],
    },
    {
      id: "study-cost-benefit",
      url: "https://www.zhihu.com/question/449908156/answer/2011119096792625256",
      excerpt: "回答强调是否读研需要结合目标行业门槛、机会成本和个人路径，而不是把学历本身当成答案。",
      dimensions: ["resources", "context", "values", "reasoning"],
    },
  ],
  "demo-grade-project": [
    {
      id: "grade-only",
      url: "https://www.zhihu.com/question/440820884/answer/1853813971",
      excerpt: "回答展示了高绩点与扎实专业基础本身可以形成竞争力，同时也说明不同学校的筛选偏好不同。",
      dimensions: ["resources", "values", "reasoning"],
    },
    {
      id: "grade-rules",
      url: "https://www.zhihu.com/question/12123022043/answer/2027024535862486295",
      excerpt: "回答提醒先看清本校绩点、排名、科研竞赛加分和名额规则，再决定时间应该投向哪里。",
      dimensions: ["growth", "context", "resources", "reasoning"],
    },
  ],
};

function dimensionOf(opinionId: string) {
  return ["health", "resources", "growth", "values", "context", "reasoning"]
    .find((dimension) => opinionId.includes(`-${dimension}-`)) ?? "reasoning";
}

/**
 * Adds traceable real Zhihu references to the authored offline demos.
 * These are related reference archives, not a claim that the authored demo
 * sentence was copied from or uniquely supported by a specific answer.
 */
export function withCuratedDemoZhihuSources(graph: OpinionGraph): OpinionGraph {
  const seeds = SEEDS[graph.questionId];
  if (!seeds?.length) return graph;

  const author: Author = {
    id: `u_curated_${graph.questionId}`,
    name: "知乎回答作者",
    title: "真实知乎回答 · 策展参考档案",
    credibility: 70,
  };
  const sources: OpinionSource[] = seeds.map((seed, index) => ({
    id: `s_curated_${graph.questionId}_${index}`,
    authorId: author.id,
    excerpt: seed.excerpt,
    upvotes: 0,
    upvotesKnown: false,
    authorKnown: false,
    url: seed.url,
  }));

  const opinions = graph.opinions.map((opinion) => {
    const dimension = dimensionOf(opinion.id);
    const matched = seeds
      .map((seed, index) => ({ seed, source: sources[index] }))
      .filter(({ seed }) => seed.dimensions.includes(dimension))
      .map(({ source }) => source.id);
    return { ...opinion, sourceIds: matched.length ? matched : [sources[0].id] };
  });

  return {
    ...graph,
    authors: [...graph.authors, author],
    sources: [...graph.sources, ...sources],
    opinions,
  };
}
