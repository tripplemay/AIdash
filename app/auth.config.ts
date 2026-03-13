import type { NextAuthConfig } from "next-auth";

// 不引入 Prisma，供 Edge Runtime（middleware）使用的轻量配置
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const PROTECTED = ["/list", "/detail", "/admin"];
      const isProtected = PROTECTED.some((p) => nextUrl.pathname.startsWith(p));

      if (isProtected) return isLoggedIn;
      // 已登录用户访问登录页，重定向到列表页
      if (nextUrl.pathname === "/" && isLoggedIn) {
        return Response.redirect(new URL("/list", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as { role?: unknown }).role = token.role;
      return session;
    },
  },
  providers: [], // 由 auth.ts 完整配置，此处留空
};
