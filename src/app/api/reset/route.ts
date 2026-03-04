import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin();
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const body = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 }
      );
    }

    // Delete all TacoTags for tacos in the team
    await prisma.tacoTag.deleteMany({
      where: { taco: { teamId } },
    });

    // Delete all Tacos in the team
    await prisma.taco.deleteMany({
      where: { teamId },
    });

    // Get all team user IDs for tracker cleanup
    const teamUsers = await prisma.user.findMany({
      where: { teamId },
      select: { id: true },
    });
    const userIds = teamUsers.map((u: { id: string }) => u.id);

    // Delete all DailyTacoTrackers for team users
    if (userIds.length > 0) {
      await prisma.dailyTacoTracker.deleteMany({
        where: { userId: { in: userIds } },
      });
    }

    // Reset all team users' counters to 0
    const resetResult = await prisma.user.updateMany({
      where: { teamId },
      data: {
        totalGiven: 0,
        totalReceived: 0,
        redeemable: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Team taco data has been reset. Users, rewards, tags, redemptions, and settings are preserved.",
      usersReset: resetResult.count,
    });
  } catch (error) {
    console.error("Error resetting team data:", error);
    return NextResponse.json(
      { error: "Failed to reset team data" },
      { status: 500 }
    );
  }
}
