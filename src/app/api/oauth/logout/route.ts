import { NextRequest, NextResponse } from "next/server";
import { deleteZhihuOAuthSession } from "@/lib/db/queries/zhihu-oauth";
import { ZHIHU_BROWSER_COOKIE, ZHIHU_SESSION_COOKIE } from "@/lib/zhihu-oauth/config";

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(ZHIHU_SESSION_COOKIE)?.value;
  if (sessionId) await deleteZhihuOAuthSession(sessionId);
  const response = NextResponse.json({ ok: true });
  for (const name of [ZHIHU_SESSION_COOKIE, ZHIHU_BROWSER_COOKIE]) {
    response.cookies.set(name, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  }
  return response;
}
