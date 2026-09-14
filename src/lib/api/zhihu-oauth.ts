import { request } from "./request";

export type ZhihuOAuthStatus = {
  ok: boolean;
  connected: boolean;
  configured: {
    appId: boolean;
    redirectUri: boolean;
    appKey: boolean;
    accessSecret: boolean;
    sessionSecret: boolean;
  };
  sessionMode: "callback-only-demo";
  profile: { id: string; fullname: string | null; headline: string | null; avatarUrl: string | null } | null;
  expiresAt: string | null;
};

export async function fetchZhihuOAuthStatus(): Promise<ZhihuOAuthStatus> {
  const response = await request("/api/oauth/status");
  if (!response.ok) throw new Error("oauth_status_failed");
  return response.json() as Promise<ZhihuOAuthStatus>;
}

export async function fetchZhihuUserDataSample() {
  const response = await request("/api/oauth/user-data");
  const json = await response.json();
  if (!response.ok) throw new Error(typeof json?.error === "string" ? json.error : "oauth_data_failed");
  return json as { ok: true; results: Record<string, { status: string; item?: unknown; error?: string }> };
}

export async function logoutZhihuOAuth(): Promise<void> {
  const response = await request("/api/oauth/logout", { method: "POST" });
  if (!response.ok) throw new Error("oauth_logout_failed");
}
