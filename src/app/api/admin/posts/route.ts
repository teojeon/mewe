// src/app/api/admin/posts/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const products =
      Array.isArray(body.products) ? body.products.filter(Boolean) : [];

    const payload = {
      influencer_id: String(body.influencer_id || "").trim(),
      title: String(body.title || "").trim(),
      cover_image_url: body.cover_path || null,   // path (private storage)
      body: (body.body ?? null) ? String(body.body).trim() : null,

      // ✅ meta는 절대 null이 되지 않게
      meta: products.length ? { products } : {},

      published: typeof body.published === "boolean" ? body.published : true,
    };

    if (!payload.influencer_id || !payload.title) {
      return NextResponse.json(
        { error: "influencer_id/title required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("posts").insert(payload);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
