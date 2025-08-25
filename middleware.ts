import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";


export function middleware(req: NextRequest) {
if (!req.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();


const auth = req.headers.get("authorization") || "";
const [scheme, encoded] = auth.split(" ");
if (scheme !== "Basic" || !encoded) return unauthorized();


const [user, pass] = Buffer.from(encoded, "base64").toString().split(":");
if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
return NextResponse.next();
}
return unauthorized();
}


function unauthorized() {
return new NextResponse("Auth required", {
status: 401,
headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
});
}


export const config = { matcher: ["/admin/:path*"] };