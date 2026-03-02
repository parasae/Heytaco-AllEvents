"use client";

import { useSession } from "next-auth/react";

export interface AuthUser {
  id: string; // Database ID
  slackId: string;
  teamId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
}

/**
 * Hook that returns the current authenticated user from the NextAuth session.
 * Replaces the old useDemoUser hook.
 */
export function useCurrentUser(): { user: AuthUser | null; loading: boolean } {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return { user: null, loading: true };
  }

  if (!session?.user) {
    return { user: null, loading: false };
  }

  const sessionUser = session.user as Record<string, unknown>;

  return {
    user: {
      id: (sessionUser.dbId as string) || "",
      slackId: (sessionUser.slackId as string) || "",
      teamId: (sessionUser.teamId as string) || "",
      name: (sessionUser.name as string) || "User",
      email: (sessionUser.email as string) || null,
      avatarUrl: (sessionUser.image as string) || null,
      isAdmin: (sessionUser.isAdmin as boolean) || false,
    },
    loading: false,
  };
}
