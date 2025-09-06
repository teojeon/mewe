// src/app/auth/signout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    await supabase.auth.signOut();
  } catch {
    // 쿠키가 이미 지워졌거나 세션이 없을 수 있음 → 무시
  }
  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  return new NextResponse("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST" },
  });
}

export async function PUT() {
  return new NextResponse("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST" },
  });
}

export async function DELETE() {
  return new NextResponse("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST" },
  });
}
