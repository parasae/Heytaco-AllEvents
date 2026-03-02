"use client";

import { useState, useEffect } from "react";
import { DEMO_TEAM_ID } from "@/lib/constants";
import type { UserProfile } from "@/lib/types";

export const DEMO_USER_STORAGE_KEY = "heytaco-demo-user";

/**
 * Fetches the first user from the demo team.
 * This avoids hardcoding a user ID that may not match
 * the auto-generated Prisma IDs from the seed script.
 */
export async function fetchDemoUser(): Promise<UserProfile | null> {
  try {
    const res = await fetch(`/api/users?teamId=${DEMO_TEAM_ID}&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    const users = Array.isArray(data) ? data : data.users || [];
    return users.length > 0 ? users[0] : null;
  } catch {
    return null;
  }
}

/**
 * React hook that fetches and caches the demo user.
 * Returns { user, loading } where user is the first user
 * in the demo team, or null if not yet loaded / on error.
 */
export function useDemoUser(): { user: UserProfile | null; loading: boolean } {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const fetched = await fetchDemoUser();
      if (!cancelled) {
        setUser(fetched);
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}
