// src/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const REALM = "Mewe Admin";

function decodeBase64(b64: string): string {
  try {
    // Edge 런타임
    // @ts-ignore
    return atob(b64);
  } catch {
    // Node 호환
    // @ts-ignore
    if (typeof Buffer !== "undefined") {
      // @ts-ignore
      return Buffer.from(b64, "base64").toString("utf8");
    }
    throw new Error("Base64 decode failed");
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin에만 Basic Auth 적용
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const user = process.env.ADMIN_USER || "";
  const pass = process.env.ADMIN_PASS || "";

  if (!user || !pass) {
    return new NextResponse("Admin auth is not configured.", { status: 500 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const match = /^Basic\s+(.+)$/i.exec(authHeader);

  if (!match) {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` },
    });
  }

  let decoded = "";
  try {
    decoded = decodeBase64(match[1]);
  } catch {
    return new NextResponse("Invalid authorization header.", { status: 400 });
  }

  const idx = decoded.indexOf(":");
  const u = idx >= 0 ? decoded.slice(0, idx) : "";
  const p = idx >= 0 ? decoded.slice(idx + 1) : "";

  if (u !== user || p !== pass) {
    return new NextResponse("Unauthorized.", {
      status: 401,
      headers: { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` },
    });
  }

  // 통과
  return NextResponse.next();
}

// /admin 전체에만 미들웨어 적용
export const config = { matcher: ["/admin", "/admin/:path*"] };
