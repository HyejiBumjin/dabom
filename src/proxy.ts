import { NextResponse, type NextRequest } from "next/server";

/** Session verification and owner checks happen in the server data-access layer. */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/saju") || request.nextUrl.pathname.startsWith("/api/")) response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/saju/:path*", "/api/:path*"] };
