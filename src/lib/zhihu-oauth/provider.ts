import type { ZhihuOAuthProfile } from "@/lib/db/schema/zhihu-oauth";
import { getZhihuOAuthConfig, getZhihuOAuthSecrets } from "./config";

type TokenResponse = { accessToken: string; expiresIn: number };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseLosslessIdentifiers(raw: string): unknown {
  const normalized = raw.replace(/("(?:uid|UrlToken)"\s*:\s*)(-?\d+)/g, '$1"$2"');
  return JSON.parse(normalized) as unknown;
}

export async function exchangeAuthorizationCode(code: string): Promise<TokenResponse> {
  const config = getZhihuOAuthConfig();
  const { appKey } = getZhihuOAuthSecrets();
  const body = new URLSearchParams({
    app_id: config.app_id,
    app_key: appKey,
    grant_type: "authorization_code",
    redirect_uri: config.redirect_uri,
    code,
  });
  const response = await fetch("https://openapi.zhihu.com/access_token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const parsed = asRecord(parseLosslessIdentifiers(await response.text()));
  const payload = asRecord(parsed?.data) ?? parsed;
  const accessToken = typeof payload?.access_token === "string" ? payload.access_token : "";
  const expiresIn = Number(payload?.expires_in);
  if (!response.ok || !accessToken || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error("ZHIHU_OAUTH_TOKEN_EXCHANGE_FAILED");
  }
  return { accessToken, expiresIn };
}

export async function fetchZhihuProfile(accessToken: string): Promise<ZhihuOAuthProfile> {
  const response = await fetch("https://openapi.zhihu.com/user", {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const parsed = asRecord(parseLosslessIdentifiers(await response.text()));
  const payload = asRecord(parsed?.data) ?? parsed;
  const id = typeof payload?.hash_id === "string"
    ? payload.hash_id
    : typeof payload?.uid === "string"
      ? payload.uid
      : "";
  if (!response.ok || !id) throw new Error("ZHIHU_OAUTH_PROFILE_FAILED");
  return {
    id,
    fullname: typeof payload?.fullname === "string" ? payload.fullname : null,
    headline: typeof payload?.headline === "string" ? payload.headline : null,
    avatarUrl: typeof payload?.avatar_path === "string" ? payload.avatar_path : null,
  };
}

type UserApiResult =
  | { status: "success" | "empty"; item: unknown | null }
  | { status: "failed"; error: string };

async function fetchUserApi(path: string, query: Record<string, string>, oauthToken: string): Promise<UserApiResult> {
  const accessSecret = process.env.ZHIHU_ACCESS_SECRET?.trim();
  if (!accessSecret) return { status: "failed", error: "access_secret_missing" };
  const url = new URL(path, "https://developer.zhihu.com");
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  try {
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${accessSecret}`,
        "x-oauth-token": oauthToken,
        "x-request-timestamp": String(Math.floor(Date.now() / 1000)),
        "content-type": "application/json",
      },
      cache: "no-store",
    });
    const parsed = asRecord(parseLosslessIdentifiers(await response.text()));
    if (!response.ok || parsed?.Code !== 0) {
      const code = typeof parsed?.Code === "number" ? String(parsed.Code) : `http_${response.status}`;
      return { status: "failed", error: code };
    }
    const data = asRecord(parsed.Data);
    const items = Array.isArray(data?.Items) ? data.Items : [];
    return items.length ? { status: "success", item: items[0] } : { status: "empty", item: null };
  } catch {
    return { status: "failed", error: "request_failed" };
  }
}

export async function fetchZhihuUserDataSample(oauthToken: string) {
  const [contents, followees, favlists, recent] = await Promise.all([
    fetchUserApi("/api/v1/user/contents", { ContentType: "all", Limit: "1" }, oauthToken),
    fetchUserApi("/api/v1/user/followees", { Limit: "1" }, oauthToken),
    fetchUserApi("/api/v1/user/favlists", { Limit: "1" }, oauthToken),
    fetchUserApi("/api/v1/user/collections", { Limit: "1" }, oauthToken),
  ]);
  const favlistRecord = favlists.status === "success" ? asRecord(favlists.item) : null;
  const token = favlistRecord?.UrlToken;
  const favlistContents = typeof token === "string" || typeof token === "number"
    ? await fetchUserApi("/api/v1/user/favlist_contents", { FavlistUrlToken: String(token), Limit: "1" }, oauthToken)
    : favlists.status === "failed"
      ? { status: "failed" as const, error: "favlist_unavailable" }
      : { status: "empty" as const, item: null };
  return { contents, followees, favlists, favlistContents, recent };
}
