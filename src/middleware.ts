import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const REALM = "Mewe Admin"; // 브라우저 Basic Auth 캐시 구분용

function decodeBase64(b64: string): string {
  try {
    // Edge 런타임(브라우저 유사)
    // @ts-ignore
    return atob(b64);
  } catch {
    // 로컬 dev(Node) 호환
    // @ts-ignore
    if (typeof Buffer !== "undefined") {
      // @ts-ignore
      return Buffer.from(b64, "base64").toString("utf8");
    }
    throw new Error("Base64 decode failed");
  }
}

export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER || "";
  const pass = process.env.ADMIN_PASS || "";

  // 환경변수 빠지면 실수로 공개되는 걸 막기 위해 500
  if (!user || !pass) {
    return new NextResponse("Admin auth is not configured.", { status: 500 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const match = /^Basic\s+(.+)$/i.exec(authHeader);

  // 인증 헤더 없으면 로그인 요구
  if (!match) {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` },
    });
  }

  // "username:password" 디코딩
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

// /admin 루트와 모든 하위 경로 적용
export const config = { matcher: ["/admin", "/admin/:path*"] };
