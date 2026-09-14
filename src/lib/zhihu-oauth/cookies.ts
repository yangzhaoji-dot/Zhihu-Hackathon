import { getZhihuOAuthSecrets } from "./config";
import { openJson, sealJson } from "./crypto";
import type { ZhihuOAuthResult, ZhihuOAuthVerificationResults } from "./types";

export type ZhihuOAuthState = {
  stateHash: string;
  browserIdHash: string;
  expiresAt: number;
};

export function sealZhihuState(value: ZhihuOAuthState): string {
  return sealJson(value, getZhihuOAuthSecrets().sessionSecret);
}

export function readZhihuState(value: string | undefined): ZhihuOAuthState | null {
  if (!value) return null;
  try {
    const state = openJson<ZhihuOAuthState>(value, getZhihuOAuthSecrets().sessionSecret);
    return state.expiresAt > Date.now() ? state : null;
  } catch {
    return null;
  }
}

export function sealZhihuResult(value: ZhihuOAuthResult): string {
  return sealJson(value, getZhihuOAuthSecrets().sessionSecret);
}

export function readZhihuResult(value: string | undefined): ZhihuOAuthResult | null {
  if (!value) return null;
  try {
    const result = openJson<ZhihuOAuthResult>(value, getZhihuOAuthSecrets().sessionSecret);
    return result.expiresAt > Date.now() ? result : null;
  } catch {
    return null;
  }
}

export function summarizeVerificationResults(
  results: Record<string, { status: string; error?: string }>
): ZhihuOAuthVerificationResults {
  const names = ["contents", "followees", "favlists", "favlistContents", "recent"] as const;
  return Object.fromEntries(names.map((name) => {
    const result = results[name];
    const status = result?.status === "success" || result?.status === "empty" ? result.status : "failed";
    return [name, status === "failed" ? { status, error: result?.error ?? "request_failed" } : { status }];
  })) as ZhihuOAuthVerificationResults;
}
