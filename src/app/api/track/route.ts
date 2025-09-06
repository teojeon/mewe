import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 서버 전용 키
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      type,
      influencerSlug: rawInfluencerSlug,
      postId,
      productId: rawProductId,
      path,
      clientId,
      meta
    } = body || {};

    if (!type || !["page_view", "product_click"].includes(type)) {
      return NextResponse.json({ ok: false, error: "invalid type" }, { status: 400 });
    }

    // 1) productId 보정 (없으면 meta.link 사용)
    const productId: string | null =
      rawProductId != null
        ? String(rawProductId)
        : (typeof meta?.link === "string" ? meta.link : null);

    // 2) influencer_slug 보정
    let influencer_slug: string | null =
      typeof rawInfluencerSlug === "string" && rawInfluencerSlug.trim()
        ? rawInfluencerSlug.trim()
        : null;

    if (!influencer_slug && postId) {
      // posts_influencers -> influencers.slug 우선, 없으면 author_influencer_id로 보정
      const { data: postRow, error: postErr } = await supabase
        .from("posts")
        .select("id, author_influencer_id, posts_influencers ( influencers ( slug ) )")
        .eq("id", postId)
        .maybeSingle();

      if (!postErr && postRow) {
        const rel = Array.isArray((postRow as any).posts_influencers)
          ? (postRow as any).posts_influencers[0]?.influencers
          : null;
        if (rel?.slug && typeof rel.slug === "string") {
          influencer_slug = rel.slug;
        } else if ((postRow as any).author_influencer_id) {
          const { data: infRow } = await supabase
            .from("influencers")
            .select("slug")
            .eq("id", (postRow as any).author_influencer_id)
            .maybeSingle();
          if (infRow?.slug && typeof infRow.slug === "string") {
            influencer_slug = infRow.slug;
          }
        }
      }
    }

    const headers = req.headers;
    const referrer = headers.get("referer") || "";
    const ua = headers.get("user-agent") || "";

    const { error } = await supabase.from("events").insert({
      event_type: type,
      influencer_slug: influencer_slug ?? null,   // ✅ 보정된 slug 저장
      post_id: postId ?? null,
      product_id: productId ?? null,
      path: path ?? null,
      referrer,
      client_id: clientId ?? null,
      user_id: null, // (원하면 서버 세션에서 실제 user.id 주입)
      ua,
      meta: meta ?? null,
    });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
