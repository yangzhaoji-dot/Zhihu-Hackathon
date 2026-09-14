import "server-only";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SEARCH_ENDPOINT = "https://developer.zhihu.com/api/v1/content/zhihu_search";
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface ZhihuSearchItem {
  Title?: string;
  ContentType?: string;
  ContentID?: string;
  ContentText?: string;
  Url?: string;
  VoteUpCount?: number;
  CommentCount?: number;
  AuthorName?: string;
  AuthorSignature?: string;
  AuthorBadgeText?: string;
  Summary?: string;
}

export interface ZhihuSearchResult {
  items: ZhihuSearchItem[];
  hasMore: boolean;
  searchHashId?: string;
}

export interface ZhihuQuestionCandidate {
  url: string;
  title: string;
  sourceCount: number;
}

interface ZhihuResponse {
  Code?: number;
  Message?: string;
  Data?: {
    Items?: ZhihuSearchItem[];
    HasMore?: boolean;
    SearchHashId?: string;
  };
}

const cache = new Map<string, { expiresAt: number; result: Promise<ZhihuSearchResult> }>();

function parseResponse(payload: string): ZhihuSearchResult {
  let response: ZhihuResponse;
  try {
    response = JSON.parse(payload) as ZhihuResponse;
  } catch {
    throw new Error("zhihu_invalid_response");
  }
  if (response.Code !== 0 || !response.Data) {
    throw new Error(response.Code === 30001 ? "zhihu_rate_limited" : "zhihu_request_failed");
  }
  return {
    items: Array.isArray(response.Data.Items) ? response.Data.Items : [],
    hasMore: Boolean(response.Data.HasMore),
    searchHashId: response.Data.SearchHashId,
  };
}

async function searchWithHttp(query: string, count: number, secret: string) {
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set("Query", query);
  url.searchParams.set("Count", String(count));
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${secret}`,
      "X-Request-Timestamp": String(Math.floor(Date.now() / 1000)),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`zhihu_http_${response.status}`);
  return parseResponse(await response.text());
}

async function searchWithLocalCli(query: string, count: number) {
  if (process.platform !== "win32" || !process.env.LOCALAPPDATA) {
    throw new Error("zhihu_auth_not_configured");
  }
  const cli = `${process.env.LOCALAPPDATA}\\ZhihuCLI\\current\\zhihu-cli.exe`;
  try {
    const { stdout } = await execFileAsync(
      cli,
      ["search", "zhihu", "--query", query, "--count", String(count)],
      { windowsHide: true, timeout: 20_000, maxBuffer: 2 * 1024 * 1024 },
    );
    return parseResponse(stdout);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("zhihu_")) throw error;
    throw new Error("zhihu_cli_unavailable");
  }
}

async function performSearch(query: string, count: number) {
  const secret = process.env.ZHIHU_ACCESS_SECRET?.trim();
  return secret
    ? searchWithHttp(query, count, secret)
    : searchWithLocalCli(query, count);
}

export function searchZhihu(query: string, count = 10): Promise<ZhihuSearchResult> {
  const normalized = query.trim().replace(/\s+/g, " ").slice(0, 200);
  if (!normalized) return Promise.reject(new Error("empty_query"));
  const safeCount = Math.max(1, Math.min(10, Math.round(count)));
  const key = `${normalized.toLocaleLowerCase("zh-CN")}:${safeCount}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const result = performSearch(normalized, safeCount).catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result });
  return result;
}

const QUESTION_URL_RE = /https?:\/\/www\.zhihu\.com\/question\/\d+/i;

export function canonicalQuestionUrl(value: string): string | null {
  const match = value.match(QUESTION_URL_RE);
  return match?.[0] ?? null;
}

export function questionCandidates(
  items: ZhihuSearchItem[],
  fallbackTitle: string,
): ZhihuQuestionCandidate[] {
  const byUrl = new Map<string, ZhihuQuestionCandidate>();
  for (const item of items) {
    const url = canonicalQuestionUrl(item.Url ?? "");
    if (!url) continue;
    const existing = byUrl.get(url);
    const title = compact(item.Title) || existing?.title || fallbackTitle;
    byUrl.set(url, {
      url,
      title,
      sourceCount: (existing?.sourceCount ?? 0) + 1,
    });
  }
  return [...byUrl.values()].slice(0, 3);
}

function compact(value: string | undefined) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 160) : "";
}

function normalizeTitle(value: string | undefined) {
  return compact(value)
    .replace(/<[^>]+>/g, "")
    .replace(/[\s?？!！,，.。:：;；、“”‘’"'《》【】()（）]/g, "")
    .toLocaleLowerCase("zh-CN");
}

function titleSimilarity(left: string | undefined, right: string | undefined) {
  const a = normalizeTitle(left);
  const b = normalizeTitle(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if ((a.length >= 6 && b.includes(a)) || (b.length >= 6 && a.includes(b))) return 0.95;

  const grams = (value: string) => {
    const result = new Set<string>();
    if (value.length === 1) result.add(value);
    for (let index = 0; index < value.length - 1; index += 1) {
      result.add(value.slice(index, index + 2));
    }
    return result;
  };
  const ga = grams(a);
  const gb = grams(b);
  let overlap = 0;
  for (const gram of ga) if (gb.has(gram)) overlap += 1;
  return overlap / Math.max(ga.size, gb.size, 1);
}

function isAnswer(item: ZhihuSearchItem) {
  return compact(item.ContentType).toLocaleLowerCase("en-US") === "answer";
}

async function fetchQuestionAnswersWithHttp(
  questionTitle: string,
  limit: number,
): Promise<ZhihuSearchResult> {
  const safeLimit = Math.max(1, Math.min(10, Math.round(limit)));
  const result = await searchZhihu(questionTitle, safeLimit);
  const ranked = result.items
    .filter((item) => isAnswer(item) && Boolean(item.Summary || item.ContentText))
    .map((item) => ({ item, score: titleSimilarity(item.Title, questionTitle) }))
    .filter(({ score }) => score >= 0.55)
    .sort((left, right) => right.score - left.score || (right.item.VoteUpCount ?? 0) - (left.item.VoteUpCount ?? 0))
    .slice(0, safeLimit)
    .map(({ item }) => item);

  return { ...result, items: ranked };
}

export async function fetchQuestionAnswers(
  questionUrl: string,
  limit = 20,
  questionTitle?: string,
): Promise<ZhihuSearchResult> {
  const canonical = canonicalQuestionUrl(questionUrl);
  if (!canonical) throw new Error("invalid_question_url");

  const secret = process.env.ZHIHU_ACCESS_SECRET?.trim();
  const normalizedTitle = compact(questionTitle);
  if (secret && normalizedTitle) {
    return fetchQuestionAnswersWithHttp(normalizedTitle, limit);
  }

  if (process.platform !== "win32" || !process.env.LOCALAPPDATA) {
    throw new Error(secret ? "zhihu_question_title_required" : "zhihu_auth_not_configured");
  }
  const cli = `${process.env.LOCALAPPDATA}\\ZhihuCLI\\current\\zhihu-cli.exe`;
  try {
    const { stdout } = await execFileAsync(
      cli,
      ["question", "answers", "--question-url", canonical, "--limit", String(Math.max(1, Math.min(20, Math.round(limit))))],
      { windowsHide: true, timeout: 20_000, maxBuffer: 4 * 1024 * 1024 },
    );
    const result = parseResponse(stdout);
    const items = result.items.filter((item) => Boolean(item.Summary || item.ContentText));
    return { ...result, items };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("zhihu_")) throw error;
    throw new Error("zhihu_question_answers_failed");
  }
}
