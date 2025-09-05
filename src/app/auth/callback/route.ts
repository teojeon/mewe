// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/database.types";

type Role = "owner" | "editor" | "viewer";
type MemRow = {
  influencer_id: string;
  role: Role | string | null;
  influencers: { slug: string | null } | null;
  created_at?: string | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") || "/";

  const supabase = createRouteHandlerClient<Database>({ cookies });

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 세션
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return NextResponse.redirect(new URL("/", url.origin));

  // admin이면 /admin
  const meta: any = session.user.app_metadata || {};
  const isAdmin =
    meta?.is_admin === true || (Array.isArray(meta?.roles) && meta.roles.includes("admin"));
  if (isAdmin) return NextResponse.redirect(new URL("/admin", url.origin));

  // 내 멤버십 확인
  const { data: mems, error } = await supabase
    .from("memberships")
    .select("influencer_id, role, influencers ( slug )")
    .eq("user_id", uid);

  if (error) return NextResponse.redirect(new URL("/", url.origin));

  if (!mems || mems.length === 0) {
    // 첫 로그인: 온보딩으로 (next는 보존)
    const to = new URL("/onboarding", url.origin);
    to.searchParams.set("next", nextParam);
    return NextResponse.redirect(to);
  }

  // 우선순위: owner > editor > viewer
  const rows = mems as unknown as MemRow[];
  const prio: Record<Role, number> = { owner: 3, editor: 2, viewer: 1 };
  rows.sort((a, b) => {
    const pa = prio[(a.role as Role) ?? "viewer"] ?? 0;
    const pb = prio[(b.role as Role) ?? "viewer"] ?? 0;
    if (pb !== pa) return pb - pa;
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return tb - ta;
  });

  const slug = rows.find((m) => m?.influencers?.slug)?.influencers?.slug ?? null;
  if (slug) return NextResponse.redirect(new URL(`/i/${slug}`, url.origin));

  // slug가 없으면 next로
  return NextResponse.redirect(new URL(nextParam, url.origin));
}
