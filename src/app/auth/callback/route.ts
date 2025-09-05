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
  const nextParam = url.searchParams.get("next");

  const supabase = createRouteHandlerClient<Database>({ cookies });

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (nextParam) {
    return NextResponse.redirect(new URL(nextParam, url.origin));
  }

  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;

  if (!uid) {
    return NextResponse.redirect(new URL("/", url.origin));
  }

  // admin이면 /admin 으로
  const meta: any = session.user.app_metadata || {};
  const isAdminMeta =
    meta?.is_admin === true ||
    (Array.isArray(meta?.roles) && meta.roles.includes("admin"));

  if (isAdminMeta) {
    return NextResponse.redirect(new URL("/admin", url.origin));
  }

  // 멤버십 조회 → slug 우선순위 선택
  const { data: mems, error } = await supabase
    .from("memberships")
    .select("influencer_id, role, influencers ( slug )")
    .eq("user_id", uid);

  if (error || !mems || mems.length === 0) {
    return NextResponse.redirect(new URL("/", url.origin));
  }

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

  const picked: MemRow | undefined = rows.find((m) => m?.influencers?.slug) ?? rows[0];
  const slug: string | null = picked?.influencers?.slug ?? null;

  return NextResponse.redirect(new URL(slug ? `/i/${slug}` : "/", url.origin));
}
