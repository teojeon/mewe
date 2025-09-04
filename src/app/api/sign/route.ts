// src/app/api/sign/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get("bucket");
  const path = searchParams.get("path");
  const expires = Number(searchParams.get("expires") || 3600); // 1시간

  if (!bucket || !path) {
    return NextResponse.json({ error: "bucket and path required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .storage
    .from(bucket)
    .createSignedUrl(path, expires);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
