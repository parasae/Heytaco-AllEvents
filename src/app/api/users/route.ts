import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const sort = searchParams.get("sort") || "received";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 }
      );
    }

    const orderBy: Record<string, string> =
      sort === "given"
        ? { totalGiven: "desc" }
        : { totalReceived: "desc" };

    const users = await prisma.user.findMany({
      where: { teamId, isActive: true },
      orderBy,
      take: limit,
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slackId, teamId, name, displayName, email, avatarUrl } = body;

    if (!slackId || !teamId || !name || !displayName) {
      return NextResponse.json(
        { error: "slackId, teamId, name, and displayName are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.upsert({
      where: { slackId },
      update: {
        teamId,
        name,
        displayName,
        email: email || undefined,
        avatarUrl: avatarUrl || undefined,
      },
      create: {
        slackId,
        teamId,
        name,
        displayName,
        email: email || null,
        avatarUrl: avatarUrl || null,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating/updating user:", error);
    return NextResponse.json(
      { error: "Failed to create/update user" },
      { status: 500 }
    );
  }
}
