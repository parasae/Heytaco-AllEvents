import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

export interface SessionUser {
  dbId: string;
  slackId: string;
  teamId: string;
  isAdmin: boolean;
  name?: string;
  email?: string;
}

/**
 * Get the current authenticated user from the server session.
 * Returns null if not authenticated.
 */
export async function getAuthUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const u = session.user as Record<string, unknown>;
  return {
    dbId: (u.dbId as string) || "",
    slackId: (u.slackId as string) || "",
    teamId: (u.teamId as string) || "",
    isAdmin: (u.isAdmin as boolean) || false,
    name: u.name as string | undefined,
    email: u.email as string | undefined,
  };
}

/**
 * Require admin access. Returns the user if admin, or a 401/403 NextResponse.
 */
export async function requireAdmin(): Promise<SessionUser | NextResponse> {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.isAdmin) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }
  return user;
}

/**
 * Require authentication (any role). Returns the user or a 401 NextResponse.
 */
export async function requireAuth(): Promise<SessionUser | NextResponse> {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}
