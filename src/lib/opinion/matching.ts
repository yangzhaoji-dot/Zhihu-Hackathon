import "server-only";

import type {
  Explorer,
  MatchKind,
  MatchResult,
  OpinionMatch,
} from "./types";
import { EXPLORERS } from "./seed-explorers";
import { aiJson, type AiMessage } from "./ai-client";
import { getOpinion, getStanceProfile } from "./store";

// ── Deterministic affinity scoring ──────────────────────────────────────────
// Matching is a pure function of two stance profiles. We score two distinct
// relationships between the viewer and each explorer:
//   resonate — you agree on the same opinions AND reject the same opinions.
//   spar     — you take opposite stances on the same opinions (productive clash).
// The AI layer only writes the human-readable reason; scores never depend on it,
// so the feature degrades gracefully when App AI is unavailable.

interface Scored {
  explorer: Explorer;
  resonateScore: number;
  sparScore: number;
  overlap: string[]; // opinions you both agree on
  coReject: string[]; // opinions you both disagree with
  clash: string[]; // opinions where your stances are opposite
}

function scoreAgainst(
  viewer: { agree: Set<string>; disagree: Set<string> },
  explorer: Explorer,
): Scored {
  const exAgree = new Set(explorer.agree);
  const exDisagree = new Set(explorer.disagree);

  const overlap: string[] = [];
  const coReject: string[] = [];
  const clash: string[] = [];

  for (const id of viewer.agree) {
    if (exAgree.has(id)) overlap.push(id);
    if (exDisagree.has(id)) clash.push(id);
  }
  for (const id of viewer.disagree) {
    if (exDisagree.has(id)) coReject.push(id);
    if (exAgree.has(id)) clash.push(id);
  }

  // Resonance: shared agreement is worth most, shared rejection reinforces it.
  const resonateRaw = overlap.length * 2 + coReject.length;
  // Friction: direct opposite stances on the same opinion.
  const sparRaw = clash.length;

  // Normalize against how many stances the viewer has marked so early explorers
  // with 1-2 marks still get meaningful percentages.
  const viewerTotal = Math.max(1, viewer.agree.size + viewer.disagree.size);
  const resonateScore = Math.min(
    100,
    Math.round((resonateRaw / (viewerTotal + 1)) * 100),
  );
  const sparScore = Math.min(
    100,
    Math.round((sparRaw / viewerTotal) * 100),
  );

  return { explorer, resonateScore, sparScore, overlap, coReject, clash };
}

function titlesOf(ids: string[]): string[] {
  return ids.map((id) => getOpinion(id)?.title ?? id);
}

// ── AI blurb (batched, one call for all matches) ────────────────────────────
const SYSTEM: AiMessage = {
  role: "system",
  content:
    "你是 OpinionSpace 的观点社交向导。根据两个人在同一议题下的立场重合与分歧，" +
    "为每一对匹配写一句自然、有温度、不肉麻的中文推荐语（不超过30字），" +
    "点出他们为什么值得认识或值得一辩。只输出规范 JSON，不要多余文字。",
};

type BlurbInput = {
  id: string;
  name: string;
  kind: MatchKind;
  overlapTitles: string[];
  clashTitles: string[];
};

async function writeBlurbs(
  items: BlurbInput[],
): Promise<Record<string, string> | null> {
  if (items.length === 0) return {};
  const payload = items.map((it) => ({
    id: it.id,
    who: it.name,
    关系: it.kind === "resonate" ? "同频共振" : "观点交锋",
    共识: it.overlapTitles,
    分歧: it.clashTitles,
  }));
  const result = await aiJson<{ blurbs: Record<string, string> }>([
    SYSTEM,
    {
      role: "user",
      content:
        `为下列每个匹配写一句推荐语，严格输出 {"blurbs":{"<id>":"推荐语", ...}}：\n` +
        JSON.stringify(payload),
    },
  ]);
  return result?.blurbs ?? null;
}

function fallbackBlurb(m: {
  kind: MatchKind;
  overlapTitles: string[];
  clashTitles: string[];
}): string {
  if (m.kind === "resonate") {
    const t = m.overlapTitles[0];
    return t ? `你们都认同「${t}」，同频的探索者。` : "立场高度重合，值得同行。";
  }
  const t = m.clashTitles[0];
  return t ? `你们在「${t}」上针锋相对，值得一辩。` : "立场相左，最适合交锋。";
}

// ── Public: match the viewer against the explorer pool ──────────────────────
export async function matchExplorers(userId: string): Promise<MatchResult> {
  const profile = await getStanceProfile(userId);
  const viewer = {
    agree: new Set(profile.agree),
    disagree: new Set(profile.disagree),
  };
  const markedCount = viewer.agree.size + viewer.disagree.size;

  const scored = EXPLORERS.map((ex) => scoreAgainst(viewer, ex));

  const resonate = scored
    .filter((s) => s.resonateScore > 0)
    .sort((a, b) => b.resonateScore - a.resonateScore)
    .slice(0, 3);
  const spar = scored
    .filter((s) => s.sparScore > 0)
    .sort((a, b) => b.sparScore - a.sparScore)
    .slice(0, 3);

  // Gather blurb inputs for one batched AI call.
  const blurbInputs: BlurbInput[] = [
    ...resonate.map((s) => ({
      id: s.explorer.id,
      name: s.explorer.name,
      kind: "resonate" as const,
      overlapTitles: titlesOf([...s.overlap, ...s.coReject]),
      clashTitles: titlesOf(s.clash),
    })),
    ...spar.map((s) => ({
      id: `spar_${s.explorer.id}`,
      name: s.explorer.name,
      kind: "spar" as const,
      overlapTitles: titlesOf([...s.overlap, ...s.coReject]),
      clashTitles: titlesOf(s.clash),
    })),
  ];

  const blurbs = markedCount > 0 ? await writeBlurbs(blurbInputs) : null;
  const source: "ai" | "fallback" = blurbs ? "ai" : "fallback";

  const toMatch =
    (kind: MatchKind, idPrefix: string) =>
    (s: Scored): OpinionMatch => {
      const overlapTitles = titlesOf([...s.overlap, ...s.coReject]);
      const clashTitles = titlesOf(s.clash);
      const key = idPrefix + s.explorer.id;
      return {
        explorer: s.explorer,
        kind,
        score: kind === "resonate" ? s.resonateScore : s.sparScore,
        overlap: [...s.overlap, ...s.coReject],
        clash: s.clash,
        blurb:
          blurbs?.[key] ?? fallbackBlurb({ kind, overlapTitles, clashTitles }),
      };
    };

  return {
    resonate: resonate.map(toMatch("resonate", "")),
    spar: spar.map(toMatch("spar", "spar_")),
    markedCount,
    source,
  };
}
