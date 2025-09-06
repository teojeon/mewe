// src/app/auth/instagram/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim();

  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

  // ✅ 기본 검증: slug/환경변수
  if (!slug) {
    return new NextResponse("invalid request: missing slug", { status: 400 });
  }
  if (!clientId || !redirectUri) {
    return new NextResponse("invalid request: instagram env not set", { status: 500 });
  }

  // ✅ CSRF 방지용 state 발급
  const state = crypto.randomUUID();

  // ✅ state & slug를 httpOnly 쿠키에 저장 (콜백에서 검증/사용)
  const resHeaders = new Headers();
  const cookieBase = "Path=/; HttpOnly; SameSite=Lax";
  resHeaders.append(
    "Set-Cookie",
    `ig_oauth_state=${encodeURIComponent(state)}; ${cookieBase}; Max-Age=600`
  );
  resHeaders.append(
    "Set-Cookie",
    `ig_oauth_slug=${encodeURIComponent(slug)}; ${cookieBase}; Max-Age=600`
  );

  // ✅ Instagram Basic Display 인가 URL
  //   scope는 최소 user_profile (user_media는 선택)
  const auth = new URL("https://api.instagram.com/oauth/authorize");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("scope", "user_profile");
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("state", state);

  return NextResponse.redirect(auth, { headers: resHeaders });
}
