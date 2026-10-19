import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_PATHS = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 세션을 갱신하고(토큰 만료 시 쿠키 재발급) 로그인 여부를 판단한다.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;
  const isAuthPage = AUTH_PATHS.includes(pathname);

  if (!isLoggedIn && !isAuthPage) {
    return redirectWithCookies(request, response, "/login");
  }
  if (isLoggedIn && isAuthPage) {
    return redirectWithCookies(request, response, "/");
  }
  return response;
}

// 리다이렉트 응답에도 갱신된 세션 쿠키를 실어 보낸다.
function redirectWithCookies(request: NextRequest, source: NextResponse, path: string) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
