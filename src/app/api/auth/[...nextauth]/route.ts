import NextAuth, { type NextAuthOptions } from "next-auth";
import SlackProvider from "next-auth/providers/slack";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    SlackProvider({
      clientId: process.env.SLACK_CLIENT_ID!,
      clientSecret: process.env.SLACK_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.provider !== "slack") return false;

      const slackId = (profile as Record<string, unknown>)?.sub as string || user.id;
      const teamId =
        ((profile as Record<string, unknown>)?.[
          "https://slack.com/team_id"
        ] as string) || process.env.SLACK_TEAM_ID || "unknown";

      try {
        // Upsert user in database on every sign-in
        await prisma.user.upsert({
          where: { slackId },
          update: {
            name: user.name || "Unknown",
            displayName: user.name || "Unknown",
            email: user.email || undefined,
            avatarUrl: user.image || undefined,
          },
          create: {
            slackId,
            teamId,
            name: user.name || "Unknown",
            displayName: user.name || "Unknown",
            email: user.email || undefined,
            avatarUrl: user.image || undefined,
          },
        });
      } catch (error) {
        console.error("Error upserting user on sign-in:", error);
        // Still allow sign-in even if DB upsert fails
      }

      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.slackId =
          (profile as Record<string, unknown>)?.sub as string || "";
        token.teamId =
          ((profile as Record<string, unknown>)?.[
            "https://slack.com/team_id"
          ] as string) || process.env.SLACK_TEAM_ID || "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).slackId =
          token.slackId as string;
        (session.user as Record<string, unknown>).teamId =
          token.teamId as string;

        // Fetch the database user ID for API calls
        try {
          const dbUser = await prisma.user.findUnique({
            where: { slackId: token.slackId as string },
            select: { id: true, isAdmin: true },
          });
          if (dbUser) {
            (session.user as Record<string, unknown>).dbId = dbUser.id;
            (session.user as Record<string, unknown>).isAdmin = dbUser.isAdmin;
          }
        } catch {
          // silently fail - user will just not have dbId
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
