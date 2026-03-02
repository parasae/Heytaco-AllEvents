import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DEFAULT_DAILY_LIMIT, MAX_TACOS_PER_MESSAGE } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (teamId) where.teamId = teamId;
    if (userId) {
      where.OR = [{ giverId: userId }, { receiverId: userId }];
    }

    const [tacos, total] = await Promise.all([
      prisma.taco.findMany({
        where,
        include: {
          giver: {
            select: { id: true, name: true, displayName: true, avatarUrl: true },
          },
          receiver: {
            select: { id: true, name: true, displayName: true, avatarUrl: true },
          },
          tags: {
            include: {
              tag: {
                select: { id: true, name: true, color: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.taco.count({ where }),
    ]);

    return NextResponse.json({
      tacos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching tacos:", error);
    return NextResponse.json(
      { error: "Failed to fetch tacos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      giverId,
      receiverId,
      amount = 1,
      message,
      channel,
      channelName,
      teamId,
      tagIds,
    } = body;

    if (!giverId || !receiverId || !teamId) {
      return NextResponse.json(
        { error: "giverId, receiverId, and teamId are required" },
        { status: 400 }
      );
    }

    if (giverId === receiverId) {
      return NextResponse.json(
        { error: "You cannot give tacos to yourself" },
        { status: 400 }
      );
    }

    if (amount < 1 || amount > MAX_TACOS_PER_MESSAGE) {
      return NextResponse.json(
        { error: `Amount must be between 1 and ${MAX_TACOS_PER_MESSAGE}` },
        { status: 400 }
      );
    }

    // Check daily limit
    const today = new Date().toISOString().split("T")[0];

    const giver = await prisma.user.findUnique({ where: { id: giverId } });
    if (!giver) {
      return NextResponse.json(
        { error: "Giver not found" },
        { status: 404 }
      );
    }

    const dailyLimit = giver.dailyLimit || DEFAULT_DAILY_LIMIT;

    const tracker = await prisma.dailyTacoTracker.findUnique({
      where: { userId_date: { userId: giverId, date: today } },
    });

    const tacosGivenToday = tracker?.tacosGiven || 0;
    const remaining = dailyLimit - tacosGivenToday;

    if (amount > remaining) {
      return NextResponse.json(
        {
          error: `Daily limit exceeded. You have ${remaining} tacos remaining today.`,
          remaining,
        },
        { status: 400 }
      );
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      return NextResponse.json(
        { error: "Receiver not found" },
        { status: 404 }
      );
    }

    // Create taco transaction in a single prisma transaction
    const taco = await prisma.$transaction(async (tx) => {
      // Create the taco
      const newTaco = await tx.taco.create({
        data: {
          giverId,
          receiverId,
          amount,
          message: message || null,
          channel: channel || null,
          channelName: channelName || null,
          teamId,
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
              tag: {
                select: { id: true, name: true, color: true },
              },
            },
          },
        },
      });

      // Create TacoTag entries if tagIds provided
      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        await tx.tacoTag.createMany({
          data: tagIds.map((tagId: string) => ({
            tacoId: newTaco.id,
            tagId,
          })),
        });
      }

      // Update giver stats
      await tx.user.update({
        where: { id: giverId },
        data: { totalGiven: { increment: amount } },
      });

      // Update receiver stats
      await tx.user.update({
        where: { id: receiverId },
        data: {
          totalReceived: { increment: amount },
          redeemable: { increment: amount },
        },
      });

      // Update daily tracker
      await tx.dailyTacoTracker.upsert({
        where: { userId_date: { userId: giverId, date: today } },
        update: { tacosGiven: { increment: amount } },
        create: { userId: giverId, date: today, tacosGiven: amount },
      });

      // Re-fetch taco with tags if tags were added
      if (tagIds && tagIds.length > 0) {
        return tx.taco.findUnique({
          where: { id: newTaco.id },
          include: {
            giver: {
              select: { id: true, name: true, displayName: true, avatarUrl: true },
            },
            receiver: {
              select: { id: true, name: true, displayName: true, avatarUrl: true },
            },
            tags: {
              include: {
                tag: {
                  select: { id: true, name: true, color: true },
                },
              },
            },
          },
        });
      }

      return newTaco;
    });

    return NextResponse.json(taco, { status: 201 });
  } catch (error) {
    console.error("Error creating taco:", error);
    return NextResponse.json(
      { error: "Failed to create taco" },
      { status: 500 }
    );
  }
}
