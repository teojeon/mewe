// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

type Role = "owner" | "editor" | "viewer";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") || "/";

  const supabase = createRouteHandlerClient({ cookies });

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return NextResponse.redirect(new URL("/", url.origin));

  // admin → /admin
  const meta: any = session.user.app_metadata || {};
  const isAdmin = meta?.is_admin === true || (Array.isArray(meta?.roles) && meta.roles.includes("admin"));
  if (isAdmin) return NextResponse.redirect(new URL("/admin", url.origin));

  // 내 멤버십 확인
  const { data: memsRaw } = await supabase
    .from("memberships")
    .select("influencer_id, role, influencers ( slug ), created_at")
    .eq("user_id", uid);

  const mems: any[] = Array.isArray(memsRaw) ? memsRaw : [];

  if (mems.length === 0) {
    // 최초 로그인(회원가입) 흐름 → 온보딩으로
    const to = new URL("/onboarding", url.origin);
    to.searchParams.set("next", nextParam);
    return NextResponse.redirect(to);
  }

  // 우선순위 owner > editor > viewer
  const prio: Record<Role, number> = { owner: 3, editor: 2, viewer: 1 };
  mems.sort((a: any, b: any) => {
    const pa = prio[(a?.role as Role) ?? "viewer"] ?? 0;
    const pb = prio[(b?.role as Role) ?? "viewer"] ?? 0;
    if (pb !== pa) return pb - pa;
    const ta = a?.created_at ? Date.parse(a.created_at) : 0;
    const tb = b?.created_at ? Date.parse(b.created_at) : 0;
    return tb - ta;
  });

  // ✅ 안전 가드로 slug 추출 (TS가 만족)
  let slug: string | null = null;
  for (const m of mems) {
    const s = (m as any)?.influencers?.slug;
    if (typeof s === "string" && s.length > 0) { slug = s; break; }
  }

  if (slug) return NextResponse.redirect(new URL(`/i/${slug}`, url.origin));
  return NextResponse.redirect(new URL(nextParam, url.origin));
}
