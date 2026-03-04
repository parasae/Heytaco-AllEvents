import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin();
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    const teamFilter = teamId ? { teamId } : {};

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Total tacos
    const totalTacosResult = await prisma.taco.aggregate({
      where: teamFilter,
      _sum: { amount: true },
    });
    const totalTacos = totalTacosResult._sum.amount || 0;

    // Total users
    const totalUsers = await prisma.user.count({
      where: { ...teamFilter, isActive: true },
    });

    // Active users (gave or received in last 7 days)
    const [activeGivers, activeReceivers] = await Promise.all([
      prisma.taco.findMany({
        where: {
          ...teamFilter,
          createdAt: { gte: sevenDaysAgo },
        },
        select: { giverId: true },
        distinct: ["giverId"],
      }),
      prisma.taco.findMany({
        where: {
          ...teamFilter,
          createdAt: { gte: sevenDaysAgo },
        },
        select: { receiverId: true },
        distinct: ["receiverId"],
      }),
    ]);

    const activeUserIds = new Set([
      ...activeGivers.map((t: { giverId: string }) => t.giverId),
      ...activeReceivers.map((t: { receiverId: string }) => t.receiverId),
    ]);
    const activeUsers = activeUserIds.size;

    // Today's tacos
    const todayTacosResult = await prisma.taco.aggregate({
      where: {
        ...teamFilter,
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    });
    const todayTacos = todayTacosResult._sum.amount || 0;

    // Weekly trend (last 30 days grouped by day)
    const tacos30Days = await prisma.taco.findMany({
      where: {
        ...teamFilter,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { amount: true, createdAt: true },
    });

    const trendMap = new Map<string, number>();
    // Initialize all 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      trendMap.set(dateStr, 0);
    }
    // Populate with actual data
    for (const taco of tacos30Days) {
      const dateStr = taco.createdAt.toISOString().split("T")[0];
      trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + taco.amount);
    }
    const weeklyTrend = Array.from(trendMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Top givers (top 10)
    const topGivers = await prisma.user.findMany({
      where: { ...teamFilter, isActive: true },
      orderBy: { totalGiven: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        displayName: true,
        avatarUrl: true,
        totalGiven: true,
        totalReceived: true,
      },
    });

    // Top receivers (top 10)
    const topReceivers = await prisma.user.findMany({
      where: { ...teamFilter, isActive: true },
      orderBy: { totalReceived: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        displayName: true,
        avatarUrl: true,
        totalGiven: true,
        totalReceived: true,
      },
    });

    // Tag distribution
    const tacoTags = await prisma.tacoTag.findMany({
      include: {
        tag: { select: { name: true, color: true } },
        taco: { select: { teamId: true } },
      },
    });

    const tagCountMap = new Map<string, { name: string; count: number; color: string }>();
    for (const tt of tacoTags) {
      if (teamId && tt.taco.teamId !== teamId) continue;
      const existing = tagCountMap.get(tt.tag.name);
      if (existing) {
        existing.count++;
      } else {
        tagCountMap.set(tt.tag.name, {
          name: tt.tag.name,
          count: 1,
          color: tt.tag.color,
        });
      }
    }
    const tagDistribution = Array.from(tagCountMap.values()).sort(
      (a, b) => b.count - a.count
    );

    const analytics = {
      totalTacos,
      totalUsers,
      activeUsers,
      todayTacos,
      weeklyTrend,
      topGivers: topGivers.map((u: { id: string; name: string; displayName: string; avatarUrl: string | null; totalGiven: number; totalReceived: number }, i: number) => ({ ...u, rank: i + 1 })),
      topReceivers: topReceivers.map((u: { id: string; name: string; displayName: string; avatarUrl: string | null; totalGiven: number; totalReceived: number }, i: number) => ({ ...u, rank: i + 1 })),
      tagDistribution,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
