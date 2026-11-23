import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Wajib login sebelum membuka halaman.
// (Di Next.js 16 file ini bernama proxy.ts, pengganti middleware.ts)

// Halaman dan API yang boleh dibuka TANPA login (pemulihan password)
const PUBLIC_PAGES = ["/login", "/lupa-password", "/sitemap.xml"];
const PUBLIC_API = ["/api/recovery/questions", "/api/recovery/reset"];
const PRIVATE_PAGES = ["/login", "/lupa-password", "/lengkapi-pemulihan"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const finish = (result: NextResponse) => {
    if (
      result.status >= 300 &&
      result.status < 400 &&
      !result.headers.has("Content-Type")
    ) {
      result.headers.set("Content-Type", "text/plain; charset=utf-8");
    }
    if (pathname.startsWith("/api/") || PRIVATE_PAGES.includes(pathname)) {
      result.headers.set(
        "Cache-Control",
        "private, no-store, max-age=0, must-revalidate"
      );
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
          response = NextResponse.next({ request });
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