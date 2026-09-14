import "server-only";

import type { Question, QuestionNetwork, QuestionRelation } from "./types";
import { canonicalQuestionUrl, searchZhihu, type ZhihuSearchItem } from "./zhihu-search";

const POSITIONS = [
  { x: 0.17, y: 0.26 },
  { x: 0.48, y: 0.17 },
  { x: 0.82, y: 0.27 },
  { x: 0.16, y: 0.72 },
  { x: 0.50, y: 0.81 },
  { x: 0.84, y: 0.70 },
] as const;

function compact(value: unknown, max = 160) {
  return typeof value === "string" ? value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function questionId(url: string) {
  const match = url.match(/\/question\/(\d+)/);
  return match ? `zhihu:${match[1]}` : `zhihu:${encodeURIComponent(url)}`;
}

function normalize(value: string) {
  return value.replace(/[\s?？!！,，.。:：;；、“”‘’"'《》【】()（）]/g, "").toLocaleLowerCase("zh-CN");
}

function titleSimilarity(left: string, right: string) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const grams = (value: string) => {
    const result = new Set<string>();
    if (value.length === 1) result.add(value);
    for (let index = 0; index < value.length - 1; index += 1) result.add(value.slice(index, index + 2));
    return result;
  };
  const ga = grams(a);
  const gb = grams(b);
  let overlap = 0;
  for (const gram of ga) if (gb.has(gram)) overlap += 1;
  return overlap / Math.max(ga.size, gb.size, 1);
}

function inferKind(title: string): Question["kind"] {
  if (/(19|20)\d{2}/.test(title)) return "temporal";
  if (/(如何|怎么|怎么办|多少|哪些|什么情况|怎样)/.test(title)) return "sub";
  if (/(为什么|前提|条件|什么时候|应该先|需要先)/.test(title)) return "prerequisite";
  if (/(以后|之后|未来|长期|风险|影响|会不会|能不能)/.test(title)) return "extension";
  return "related";
}

function relationFor(kind: Question["kind"]): Pick<QuestionRelation, "type" | "label"> {
  if (kind === "sub") return { type: "add", label: "子问题" };
  if (kind === "prerequisite") return { type: "cond", label: "前置问题" };
  if (kind === "extension") return { type: "add", label: "延伸问题" };
  if (kind === "temporal") return { type: "cond", label: "同源议题" };
  return { type: "support", label: "相关问题" };
}

function extractCandidates(items: ZhihuSearchItem[], coreUrl: string, coreTitle: string) {
  const byUrl = new Map<string, { url: string; title: string; score: number }>();
  for (const item of items) {
    const url = canonicalQuestionUrl(item.Url ?? "");
    const title = compact(item.Title, 120);
    if (!url || !title || url === coreUrl) continue;
    const score = titleSimilarity(coreTitle, title) + Math.min(0.35, Math.log10(1 + Math.max(0, Number(item.VoteUpCount) || 0)) / 12);
    const existing = byUrl.get(url);
    if (!existing || score > existing.score) byUrl.set(url, { url, title, score });
  }
  return [...byUrl.values()].sort((a, b) => b.score - a.score).slice(0, 6);
}

export async function buildQuestionNetwork(input: {
  query: string;
  coreQuestionId: string;
  coreTitle: string;
  coreUrl: string;
}): Promise<QuestionNetwork> {
  const coreTitle = compact(input.coreTitle, 120) || compact(input.query, 120);
  const coreUrl = canonicalQuestionUrl(input.coreUrl) ?? input.coreUrl;
  let items: ZhihuSearchItem[] = [];
  try {
    const queries = [...new Set([coreTitle, compact(input.query, 120)].filter(Boolean))];
    const results = await Promise.all(queries.map((query) => searchZhihu(query, 10)));
    items = results.flatMap((result) => result.items);
  } catch {
    // A question graph is still useful when related-question retrieval is unavailable.
  }

  const candidates = extractCandidates(items, coreUrl, coreTitle);
  const questions: Question[] = [
    { id: input.coreQuestionId, title: coreTitle, x: 0.5, y: 0.49, core: true },
    ...candidates.map((candidate, index) => ({
      id: questionId(candidate.url),
      title: candidate.title,
      x: POSITIONS[index]?.x ?? 0.5,
      y: POSITIONS[index]?.y ?? 0.5,
      kind: inferKind(candidate.title),
    } satisfies Question)),
  ];

  const relations: QuestionRelation[] = questions.slice(1).map((question) => ({
    from: input.coreQuestionId,
    to: question.id,
    ...relationFor(question.kind),
  }));

  // Add at most two secondary links when two neighboring questions clearly share
  // wording. This keeps the map from becoming a pure hub-and-spoke diagram while
  // avoiding invented semantic claims.
  const secondary: Array<{ score: number; relation: QuestionRelation }> = [];
  for (let left = 1; left < questions.length; left += 1) {
    for (let right = left + 1; right < questions.length; right += 1) {
      const score = titleSimilarity(questions[left].title, questions[right].title);
      if (score < 0.22) continue;
      secondary.push({
        score,
        relation: { from: questions[left].id, to: questions[right].id, type: "add", label: "相邻追问" },
      });
    }
  }
  secondary.sort((a, b) => b.score - a.score);
  relations.push(...secondary.slice(0, 2).map((item) => item.relation));

  return { coreQuestionId: input.coreQuestionId, questions, relations };
}
