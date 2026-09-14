import { NextResponse } from "next/server";
import { ZHIHU_BROWSER_COOKIE, ZHIHU_SESSION_COOKIE, ZHIHU_STATE_COOKIE } from "@/lib/zhihu-oauth/config";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  for (const name of [ZHIHU_SESSION_COOKIE, ZHIHU_BROWSER_COOKIE, ZHIHU_STATE_COOKIE]) {
    response.cookies.set(name, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  }
  return response;
}
