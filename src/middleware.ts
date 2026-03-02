import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/signin",
  },
});

export const config = {
  // Protect all app routes, but not the landing page, sign-in, or API routes
  matcher: [
    "/dashboard/:path*",
    "/leaderboard/:path*",
    "/activity/:path*",
    "/rewards/:path*",
    "/admin/:path*",
  ],
};
