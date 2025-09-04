// src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs"; // Edge 아님(파일 업로드는 node 권장)
export const maxDuration = 60;   // 대용량 대비(옵션)

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bucket = searchParams.get("bucket");    // avatars | covers
    const prefix = searchParams.get("prefix") || ""; // 선택: 경로 프리픽스
    if (!bucket) {
      return NextResponse.json({ error: "bucket is required" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    // 확장자/파일명 만들기
    const ext = file.name.split(".").pop() || "jpg";
    const rand = Math.random().toString(36).slice(2);
    const name = `${Date.now()}_${rand}.${ext}`;
    const path = prefix ? `${prefix}/${name}` : name;

    // 업로드
    const arrayBuf = await file.arrayBuffer();
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, Buffer.from(arrayBuf), {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    // public URL 반환
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "upload failed" }, { status: 500 });
  }
}
