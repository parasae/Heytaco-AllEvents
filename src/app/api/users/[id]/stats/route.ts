import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DEFAULT_DAILY_LIMIT } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const dailyLimit = user.dailyLimit || DEFAULT_DAILY_LIMIT;

    // Get daily remaining
    const tracker = await prisma.dailyTacoTracker.findUnique({
      where: { userId_date: { userId: id, date: today } },
    });
    const tacosGivenToday = tracker?.tacosGiven || 0;
    const tacosRemaining = dailyLimit - tacosGivenToday;

    // Calculate streak: consecutive days the user gave tacos
    const trackers = await prisma.dailyTacoTracker.findMany({
      where: { userId: id },
      orderBy: { date: "desc" },
    });

    let streak = 0;
    const now = new Date();
    // Start checking from today or yesterday
    const checkDate = new Date(now);
    checkDate.setHours(0, 0, 0, 0);

    const trackerDates = new Set(trackers.map((t: { date: string }) => t.date));

    // If the user hasn't given today, start from yesterday
    if (!trackerDates.has(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (trackerDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Monthly given/received
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthlyGiven, monthlyReceived] = await Promise.all([
      prisma.taco.aggregate({
        where: {
          giverId: id,
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.taco.aggregate({
        where: {
          receiverId: id,
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    // Recent activity (last 20 transactions)
    const recentActivity = await prisma.taco.findMany({
      where: {
        OR: [{ giverId: id }, { receiverId: id }],
      },
      include: {
        giver: {
          select: { id: true, name: true, displayName: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, name: true, displayName: true, avatarUrl: true },
        },
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      daily: {
        tacosGiven: tacosGivenToday,
        tacosRemaining,
        dailyLimit,
      },
      streak,
      monthly: {
        given: monthlyGiven._sum.amount || 0,
        received: monthlyReceived._sum.amount || 0,
      },
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch user stats" },
      { status: 500 }
    );
  }
}
