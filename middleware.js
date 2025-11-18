import { NextResponse } from "next/server";

export function middleware(request) {
  // Get the cookie
  const authCookie = request.cookies.get("auth_token");
  const { pathname } = request.nextUrl;

  // If user is on the login page, let them stay
  if (pathname === "/login") {
    // Optional: If they are already logged in, send them to home
    if (authCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // If user is NOT logged in, send them to login
  if (!authCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Allow request to proceed
  return NextResponse.next();
}

// Apply this logic to all pages except API routes (so the login API works) and static files
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
