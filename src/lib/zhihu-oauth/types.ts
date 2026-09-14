export type ZhihuOAuthProfile = {
  id: string;
  fullname: string | null;
  headline: string | null;
  avatarUrl: string | null;
};

export type ZhihuOAuthResultState = "success" | "empty" | "failed";

export type ZhihuOAuthVerificationResults = Record<
  "contents" | "followees" | "favlists" | "favlistContents" | "recent",
  { status: ZhihuOAuthResultState; error?: string }
>;

export type ZhihuOAuthResult = {
  profile: ZhihuOAuthProfile;
  results: ZhihuOAuthVerificationResults;
  expiresAt: number;
};
