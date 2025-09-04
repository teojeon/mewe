// src/app/api/admin/influencers/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 기대하는 형태: { name, slug, bio, avatar_path, links }
    // avatar_path = Storage path (private) — 이미 5-C 반영 상태
    const payload = {
      name: (body.name ?? "").trim(),
      slug: (body.slug ?? "").trim(),
      bio: body.bio?.trim() || null,
      avatar_url: body.avatar_path || null,
      links: Array.isArray(body.links) && body.links.length ? body.links : null,
    };

    if (!payload.name || !payload.slug) {
      return NextResponse.json({ error: "name/slug required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("influencers").insert(payload);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
