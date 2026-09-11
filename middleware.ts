import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export const config = {
  matcher: ["/api/:path*"],
  runtime: "nodejs",
};

const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/reset-password",
  "/api/auth/logout",
];

const APP_KEY =
  process.env.APP_SECRET ??
  process.env.JWT_SECRET ??
  "fallback_secret_change_me";

function getAllowedOrigins(): string[] {
  const configured =
    process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || "";

  return configured
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

const CLI_BOT_UA =
  /HeadlessChrome|curl|PostmanRuntime|Wget|python-requests|Go-http-client|node-fetch|axios|Burp|ZAP|jq|httpclient/i;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const allowedOrigins = getAllowedOrigins();

  // 1. x-app-key — only our app's JavaScript knows this value
  const providedKey = request.headers.get("x-app-key");
  if (!providedKey || providedKey !== APP_KEY) {
    return NextResponse.json(
      { error: "Unauthorized — missing or invalid app key" },
      { status: 401 },
    );
  }

  // 2. Origin / Referer — must match our application
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const source = origin || referer || "";

  const isAllowedOrigin = allowedOrigins.some((allowed) =>
    source.startsWith(allowed),
  );

  if (!isAllowedOrigin) {
    return NextResponse.json(
      { error: "Forbidden — untrusted origin" },
      { status: 403 },
    );
  }

  // 3. sec-fetch-site — block cross-site requests (CSRF protection)
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site" || secFetchSite === "cross-origin") {
    return NextResponse.json(
      { error: "Forbidden — cross-site request" },
      { status: 403 },
    );
  }

  // 4. User-Agent — block known CLI tools and bots
  const userAgent = request.headers.get("user-agent") || "";
  if (CLI_BOT_UA.test(userAgent)) {
    return NextResponse.json(
      { error: "Unauthorized — blocked user agent" },
      { status: 401 },
    );
  }

  // 5. JWT token check — only for protected routes
  if (!PUBLIC_API_ROUTES.includes(pathname)) {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    try {
      const payload = jwt.verify(token, APP_KEY) as {
        id: number;
        mobile: string;
        email: string;
        usertype: string;
      };

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", String(payload.id));
      requestHeaders.set("x-user-mobile", payload.mobile);
      requestHeaders.set("x-user-email", payload.email);
      requestHeaders.set("x-user-type", payload.usertype);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }
  }

  return NextResponse.next();
}
