"use client";

import { useMemo } from "react";
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
 * Uses useMemo to maintain stable object references and prevent infinite
 * re-render loops in components that depend on the user object.
 */
export function useCurrentUser(): { user: AuthUser | null; loading: boolean } {
  const { data: session, status } = useSession();

  const user = useMemo<AuthUser | null>(() => {
    if (status === "loading" || !session?.user) {
      return null;
    }

    const sessionUser = session.user as Record<string, unknown>;

    return {
      id: (sessionUser.dbId as string) || "",
      slackId: (sessionUser.slackId as string) || "",
      teamId: (sessionUser.teamId as string) || "",
      name: (sessionUser.name as string) || "User",
      email: (sessionUser.email as string) || null,
      avatarUrl: (sessionUser.image as string) || null,
      isAdmin: (sessionUser.isAdmin as boolean) || false,
    };
  }, [session, status]);

  return {
    user,
    loading: status === "loading",
  };
}
