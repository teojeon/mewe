// src/app/admin/api/verify/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const influencer_id = String(body?.influencer_id || "");
    const verified = !!body?.verified;

    if (!influencer_id) {
      return NextResponse.json({ ok: false, error: "missing influencer_id" }, { status: 400 });
    }

    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!SERVICE_ROLE || !URL) {
      return NextResponse.json({ ok: false, error: "server env not configured" }, { status: 500 });
    }

    // RLS 우회 위해 서비스 권한 사용 (서버 전용)
    const res = await fetch(`${URL}/rest/v1/influencers?id=eq.${encodeURIComponent(influencer_id)}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        instagram_verified_at: verified ? new Date().toISOString() : null,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ ok: false, error: `supabase error: ${res.status} ${text}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown error" }, { status: 500 });
  }
}

export async function GET() {
  return new NextResponse("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}
