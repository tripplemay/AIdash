import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/list", "/detail", "/admin"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));

  if (isProtected || pathname === "/") {
    const session = await auth();

    if (isProtected && !session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (pathname === "/" && session) {
      return NextResponse.redirect(new URL("/list", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|course-packages).*)"],
};
