import type { NextAuthConfig } from "next-auth";

// 不引入 Prisma，供 Edge Runtime（middleware）使用的轻量配置
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const PROTECTED = ["/list", "/detail", "/admin", "/lesson", "/course-rnd"];
      const isProtected = PROTECTED.some((p) => nextUrl.pathname.startsWith(p));

      if (isProtected) return isLoggedIn;
      // 已登录用户访问登录页，重定向到列表页
      if (nextUrl.pathname === "/" && isLoggedIn) {
        return Response.redirect(new URL("/list", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.userId = (user as { id?: string }).id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: unknown }).role = token.role;
        (session.user as { id?: unknown }).id = token.userId;
      }
      return session;
    },
  },
  providers: [], // 由 auth.ts 完整配置，此处留空
};
