import "server-only";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseQuestionAnswersPayload } from "./zhihu-question-answers";

const execFileAsync = promisify(execFile);
const SEARCH_ENDPOINT = "https://developer.zhihu.com/api/v1/content/zhihu_search";
const QUESTION_ANSWERS_ENDPOINT = "https://developer.zhihu.com/api/v1/content/question_answers";
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
  AuthorAvatar?: string;
  AuthorSignature?: string;
  AuthorBadgeText?: string;
  EditTime?: number;
  Summary?: string;
}

export interface ZhihuSearchResult {
  items: ZhihuSearchItem[];
  hasMore: boolean;
  searchHashId?: string;
  total?: number;
}

export interface ZhihuQuestionCandidate {
  url: string;
  title: string;
  sourceCount: number;
}

type ZhihuSearchResponse = {
  Code?: number;
  Message?: string;
  Data?: {
    Items?: ZhihuSearchItem[];
    HasMore?: boolean;
    SearchHashId?: string;
  };
};

const searchCache = new Map<string, { expiresAt: number; result: Promise<ZhihuSearchResult> }>();
const answerCache = new Map<string, { expiresAt: number; result: Promise<ZhihuSearchResult> }>();

function authHeaders(secret: string) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${secret}`,
    "X-Request-Timestamp": String(Math.floor(Date.now() / 1000)),
  };
}

function parseSearchResponse(payload: string): ZhihuSearchResult {
  let response: ZhihuSearchResponse;
  try {
    response = JSON.parse(payload) as ZhihuSearchResponse;
  } catch {
    throw new Error("zhihu_invalid_response");
  }
  if (response.Code !== 0 || !response.Data) {
    if (response.Code === 30001) throw new Error("zhihu_rate_limited");
    if (response.Code === 20001) throw new Error("zhihu_auth_failed");
    throw new Error("zhihu_request_failed");
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
    headers: authHeaders(secret),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`zhihu_http_${response.status}`);
  return parseSearchResponse(await response.text());
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
    return parseSearchResponse(stdout);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("zhihu_")) throw error;
    throw new Error("zhihu_cli_unavailable");
  }
}

async function performSearch(query: string, count: number) {
  const secret = process.env.ZHIHU_ACCESS_SECRET?.trim();
  return secret ? searchWithHttp(query, count, secret) : searchWithLocalCli(query, count);
}

export function searchZhihu(query: string, count = 10): Promise<ZhihuSearchResult> {
  const normalized = query.trim().replace(/\s+/g, " ").slice(0, 200);
  if (!normalized) return Promise.reject(new Error("empty_query"));
  const safeCount = Math.max(1, Math.min(10, Math.round(count)));
  const key = `${normalized.toLocaleLowerCase("zh-CN")}:${safeCount}`;
  const cached = searchCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  const result = performSearch(normalized, safeCount).catch((error) => {
    searchCache.delete(key);
    throw error;
  });
  searchCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result });
  if (searchCache.size > 30) searchCache.delete(searchCache.keys().next().value as string);
  return result;
}

const QUESTION_URL_RE = /https?:\/\/www\.zhihu\.com\/question\/\d+/i;

export function canonicalQuestionUrl(value: string): string | null {
  const match = value.match(QUESTION_URL_RE);
  return match?.[0] ?? null;
}

function compact(value: string | undefined) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 160) : "";
}

export function questionCandidates(items: ZhihuSearchItem[], fallbackTitle: string): ZhihuQuestionCandidate[] {
  const byUrl = new Map<string, ZhihuQuestionCandidate>();
  for (const item of items) {
    const url = canonicalQuestionUrl(item.Url ?? "");
    if (!url) continue;
    const existing = byUrl.get(url);
    const title = compact(item.Title) || existing?.title || fallbackTitle;
    byUrl.set(url, { url, title, sourceCount: (existing?.sourceCount ?? 0) + 1 });
  }
  return [...byUrl.values()].slice(0, 3);
}

async function fetchQuestionAnswersPage(questionUrl: string, offset: number, limit: number, secret: string) {
  const url = new URL(QUESTION_ANSWERS_ENDPOINT);
  url.searchParams.set("QuestionUrl", questionUrl);
  url.searchParams.set("Offset", String(offset));
  url.searchParams.set("Limit", String(limit));
  const response = await fetch(url, {
    headers: authHeaders(secret),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`zhihu_question_answers_http_${response.status}`);
  return parseQuestionAnswersPayload(await response.json());
}

async function fetchQuestionAnswersWithHttp(
  questionUrl: string,
  limit: number,
  secret: string,
  questionTitle?: string,
): Promise<ZhihuSearchResult> {
  const target = Math.max(1, Math.min(50, Math.round(limit)));
  const requestLimit = Math.min(50, Math.max(target, Math.min(50, target * 2)));
  const collected: ZhihuSearchItem[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let isEnd = false;
  let total: number | undefined;

  // Usually one 40–50 item request is enough for the 20-source graph. Follow
  // NextOffset only when filtering left us short, and cap automatic pagination
  // to protect the daily question_answers quota.
  for (let pageIndex = 0; pageIndex < 3 && !isEnd && collected.length < target; pageIndex += 1) {
    const page = await fetchQuestionAnswersPage(questionUrl, offset, requestLimit, secret);
    isEnd = page.isEnd;
    total = page.total ?? total;
    for (const item of page.items) {
      const identity = item.ContentToken || item.Url || "";
      if (!identity || seen.has(identity)) continue;
      seen.add(identity);
      collected.push({
        Title: compact(questionTitle) || undefined,
        ContentType: item.ContentType || "Answer",
        ContentID: item.ContentToken,
        ContentText: item.Summary,
        Summary: item.Summary,
        Url: item.Url,
      });
    }
    if (collected.length >= target || isEnd) break;
    if (page.nextOffset === undefined || page.nextOffset <= offset) break;
    offset = page.nextOffset;
  }

  return {
    items: collected.slice(0, target),
    hasMore: collected.length > target || !isEnd,
    total,
  };
}

async function fetchQuestionAnswersWithCli(questionUrl: string, limit: number): Promise<ZhihuSearchResult> {
  if (process.platform !== "win32" || !process.env.LOCALAPPDATA) {
    throw new Error("zhihu_auth_not_configured");
  }
  const cli = `${process.env.LOCALAPPDATA}\\ZhihuCLI\\current\\zhihu-cli.exe`;
  try {
    const { stdout } = await execFileAsync(
      cli,
      ["question", "answers", "--question-url", questionUrl, "--limit", String(Math.max(1, Math.min(50, Math.round(limit))))],
      { windowsHide: true, timeout: 25_000, maxBuffer: 4 * 1024 * 1024 },
    );
    const result = parseSearchResponse(stdout);
    return { ...result, items: result.items.filter((item) => Boolean(item.Summary || item.ContentText)) };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("zhihu_")) throw error;
    throw new Error("zhihu_question_answers_failed");
  }
}

export function fetchQuestionAnswers(
  questionUrl: string,
  limit = 20,
  questionTitle?: string,
): Promise<ZhihuSearchResult> {
  const canonical = canonicalQuestionUrl(questionUrl);
  if (!canonical) return Promise.reject(new Error("invalid_question_url"));
  const safeLimit = Math.max(1, Math.min(50, Math.round(limit)));
  const key = `${canonical}:${safeLimit}`;
  const cached = answerCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const secret = process.env.ZHIHU_ACCESS_SECRET?.trim();
  const result = (secret
    ? fetchQuestionAnswersWithHttp(canonical, safeLimit, secret, questionTitle)
    : fetchQuestionAnswersWithCli(canonical, safeLimit)
  ).catch((error) => {
    answerCache.delete(key);
    throw error;
  });
  answerCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result });
  if (answerCache.size > 20) answerCache.delete(answerCache.keys().next().value as string);
  return result;
}
