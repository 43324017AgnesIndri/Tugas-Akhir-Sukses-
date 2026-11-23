import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Wajib login sebelum membuka halaman.
// (Di Next.js 16 file ini bernama proxy.ts, pengganti middleware.ts)

// Halaman dan API yang boleh dibuka TANPA login (pemulihan password)
const PUBLIC_PAGES = ["/login", "/lupa-password", "/sitemap.xml"];
const PUBLIC_API = ["/api/recovery/questions", "/api/recovery/reset"];
const PRIVATE_PAGES = ["/login", "/lupa-password", "/lengkapi-pemulihan"];
const NONCE_CSP_PATHS = ["/", ...PRIVATE_PAGES, "/sitemap.xml"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isNoncePath = NONCE_CSP_PATHS.includes(pathname);
  const nonce = isNoncePath
    ? Buffer.from(crypto.randomUUID()).toString("base64")
    : null;
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : "https://*.supabase.co";
  const supabaseRealtimeOrigin = supabaseOrigin.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  const contentSecurityPolicy = nonce
    ? [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
        `style-src 'self' 'nonce-${nonce}'`,
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        `connect-src 'self' ${supabaseOrigin} ${supabaseRealtimeOrigin}`,
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "form-action 'self'",
      ].join("; ")
    : [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        `connect-src 'self' ${supabaseOrigin} ${supabaseRealtimeOrigin}`,
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "form-action 'self'",
      ].join("; ");
  const requestHeaders = new Headers(request.headers);
  if (nonce) requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const nextResponse = () => {
    if (!nonce) return NextResponse.next({ request });
    requestHeaders.set("cookie", request.cookies.toString());
    return NextResponse.next({ request: { headers: requestHeaders } });
  };
  let response = nextResponse();

  const finish = (result: NextResponse) => {
    result.headers.set("Content-Security-Policy", contentSecurityPolicy);
    if (
      result.status >= 300 &&
      result.status < 400 &&
      !result.headers.has("Content-Type")
    ) {
      result.headers.set("Content-Type", "text/plain; charset=utf-8");
    }
    if (PRIVATE_PAGES.includes(pathname)) {
      result.headers.set(
        "Cache-Control",
        "private, no-store, no-cache, must-revalidate"
      );
    } else if (pathname.startsWith("/api/")) {
      result.headers.set("Cache-Control", "private, no-store");
    }
    return result;
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = nextResponse();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = pathname === "/login";
  const isPublic = PUBLIC_PAGES.includes(pathname) || PUBLIC_API.includes(pathname);

  // Belum login: API dijawab 401, halaman lain diarahkan ke /login
  if (!user && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return finish(NextResponse.json({ error: "Belum login" }, { status: 401 }));
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return finish(NextResponse.redirect(url));
  }

  // Sudah login tapi membuka /login: kembalikan ke dashboard
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return finish(NextResponse.redirect(url));
  }

  return finish(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};