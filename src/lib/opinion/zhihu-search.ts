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
}

export interface ZhihuSearchResult {
  items: ZhihuSearchItem[];
  hasMore: boolean;
  searchHashId?: string;
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
