import hackathonConfig from "../../../hackathon.config.json";

export const ZHIHU_BROWSER_COOKIE = "zhihu_oauth_browser";
export const ZHIHU_SESSION_COOKIE = "zhihu_oauth_session";

type OAuthConfig = {
  enabled: boolean;
  app_id: string;
  redirect_uri: string;
};

export function getZhihuOAuthConfig(): OAuthConfig {
  const oauth = hackathonConfig.oauth;
  if (!oauth.enabled || !oauth.app_id || !oauth.redirect_uri) {
    throw new Error("ZHIHU_OAUTH_CONFIG_MISSING");
  }
  const redirect = new URL(oauth.redirect_uri);
  if (redirect.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(redirect.hostname)) {
    throw new Error("ZHIHU_OAUTH_REDIRECT_INVALID");
  }
  return oauth;
}

export function getZhihuOAuthSecrets() {
  const appKey = process.env.ZHIHU_OAUTH_APP_KEY?.trim();
  const sessionSecret = process.env.ZHIHU_OAUTH_SESSION_SECRET?.trim();
  if (!appKey) throw new Error("ZHIHU_OAUTH_APP_KEY_MISSING");
  if (!sessionSecret || sessionSecret.length < 32) throw new Error("ZHIHU_OAUTH_SESSION_SECRET_MISSING");
  return { appKey, sessionSecret };
}

export function hasConfiguredSecret(name: "ZHIHU_OAUTH_APP_KEY" | "ZHIHU_ACCESS_SECRET" | "ZHIHU_OAUTH_SESSION_SECRET") {
  const value = process.env[name]?.trim();
  return name === "ZHIHU_OAUTH_SESSION_SECRET" ? Boolean(value && value.length >= 32) : Boolean(value);
}
