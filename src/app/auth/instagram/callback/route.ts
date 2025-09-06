// src/app/auth/instagram/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

function normalizeIg(s: string): string {
  return (s || "").trim().replace(/^@/, "").toLowerCase();
}

type TokenResp = {
  access_token: string;
  user_id: string;
  // expires_in?: number;
};

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description");

  const cookieStore = cookies();
  const stateCookie = cookieStore.get("ig_oauth_state")?.value || "";
  const slugCookie = cookieStore.get("ig_oauth_slug")?.value || "";

  const clientId = process.env.INSTAGRAM_CLIENT_ID!;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET!;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI!;

  // 사용자가 취소했거나 오류가 전달된 경우
  if (err) {
    return redirectWithMsg(`/i/${encodeURIComponent(slugCookie)}/manage`, `igerror=${encodeURIComponent(errDesc || err)}`);
  }

  // 기본 검증
  if (!code || !state || !stateCookie || !slugCookie) {
    return new NextResponse("invalid callback", { status: 400 });
  }
  if (state !== stateCookie) {
    return new NextResponse("invalid state", { status: 400 });
  }

  // ✅ 토큰 교환
  // Instagram Basic Display: https://api.instagram.com/oauth/access_token
  const form = new URLSearchParams();
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);
  form.set("grant_type", "authorization_code");
  form.set("redirect_uri", redirectUri);
  form.set("code", code);

  const tokenResp = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    cache: "no-store",
  });

  if (!tokenResp.ok) {
    const t = await safeText(tokenResp);
    return redirectWithMsg(`/i/${encodeURIComponent(slugCookie)}/manage`, `igerror=${encodeURIComponent("token_exchange_failed")}`);
  }

  const tokenJson = (await tokenResp.json()) as TokenResp;
  const accessToken = tokenJson?.access_token;
  if (!accessToken) {
    return redirectWithMsg(`/i/${encodeURIComponent(slugCookie)}/manage`, `igerror=${encodeURIComponent("no_access_token")}`);
  }

  // ✅ 사용자 정보 조회
  const meResp = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!meResp.ok) {
    return redirectWithMsg(`/i/${encodeURIComponent(slugCookie)}/manage`, `igerror=${encodeURIComponent("me_fetch_failed")}`);
  }
  const me = await meResp.json();
  const username: string | undefined = me?.username;

  const normalizedSlug = normalizeIg(slugCookie);
const normalizedUsername = normalizeIg(username || "");

  try {
  if (username && normalizedSlug === normalizedUsername) {
    // verified!
    const { error: upErr } = await supabase
      .from("influencers")
      .update({
        instagram_username: username,
        instagram_user_id: String(me?.id || ""),
        instagram_verified_at: new Date().toISOString(),
      })
      .eq("slug", normalizedSlug);
    if (upErr) throw upErr;

    clearStateCookies();
    return redirectWithMsg(`/i/${encodeURIComponent(normalizedSlug)}/manage`, "ig=verified");
  } else {
    clearStateCookies();
    return redirectWithMsg(
      `/i/${encodeURIComponent(normalizedSlug)}/manage`,
      `igmismatch=${encodeURIComponent(username || "unknown")}`
    );
  }
} catch (e) {
  clearStateCookies();
  return redirectWithMsg(
    `/i/${encodeURIComponent(normalizedSlug)}/manage`,
    `igerror=${encodeURIComponent("update_failed")}`
  );
}
}

// 헬퍼들
function redirectWithMsg(target: string, query: string) {
  const url = `${target}${target.includes("?") ? "&" : "?"}${query}`;
  return NextResponse.redirect(url);
}
async function safeText(r: Response) {
  try {
    return await r.text();
  } catch {
    return "";
  }
}
function clearStateCookies() {
  const base = "Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
  const headers = new Headers();
  headers.append("Set-Cookie", `ig_oauth_state=; ${base}`);
  headers.append("Set-Cookie", `ig_oauth_slug=; ${base}`);
  // 다음 응답에 합쳐 쓰는 게 일반적이지만, 여기선 각 redirectWithMsg에서 새 응답을 만들어서 생략
}
