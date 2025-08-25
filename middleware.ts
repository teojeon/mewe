import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * /admin 이하 전부 Basic Auth
 * - ADMIN_USER / ADMIN_PASS 환경변수 필요
 * - Vercel / 로컬(.env.local) 양쪽에서 동일하게 동작
 */
export function middleware(req: NextRequest) {
  // /admin 하위 경로만 검사 (config.matcher와 중복이지만 안전빵)
  if (!req.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const user = process.env.ADMIN_USER || "";
  const pass = process.env.ADMIN_PASS || "";

  // env 미설정 시, 실수로 잠금 해제되는 것을 방지
  if (!user || !pass) {
    return new NextResponse("Admin auth is not configured.", { status: 500 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const [scheme, encoded] = authHeader.split(" ");

  // 유효한 Authorization 헤더가 없으면 로그인 요구
  if (scheme !== "Basic" || !encoded) {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Admin Area", charset="UTF-8"' },
    });
  }

  // Edge 런타임: atob 사용 가능 (Buffer 사용 불가)
  let decoded = "";
  try {
    decoded = atob(encoded);
  } catch {
    return new NextResponse("Invalid authorization header.", { status: 400 });
  }

  const [u, p] = decoded.split(":");

  if (u !== user || p !== pass) {
    return new NextResponse("Unauthorized.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Admin Area", charset="UTF-8"' },
    });
  }

  // 통과
  return NextResponse.next();
}

// /admin 하위 모든 경로에만 적용
export const config = {
  matcher: ["/admin/:path*"],
};
