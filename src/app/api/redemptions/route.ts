import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const userId = searchParams.get("userId");

    const where: Record<string, unknown> = {};
    if (teamId) where.teamId = teamId;
    if (userId) where.userId = userId;

    const redemptions = await prisma.redemption.findMany({
      where,
      include: {
        user: {
          select: { name: true, displayName: true, avatarUrl: true },
        },
        reward: {
          select: { title: true, cost: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(redemptions);
  } catch (error) {
    console.error("Error fetching redemptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch redemptions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, rewardId, teamId } = body;

    if (!userId || !rewardId || !teamId) {
      return NextResponse.json(
        { error: "userId, rewardId, and teamId are required" },
        { status: 400 }
      );
    }

    // Check user exists and has enough redeemable tacos
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check reward exists and is active
    const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
    if (!reward || !reward.isActive) {
      return NextResponse.json(
        { error: "Reward not found or inactive" },
        { status: 404 }
      );
    }

    // Check if user has enough redeemable tacos
    if (user.redeemable < reward.cost) {
      return NextResponse.json(
        {
          error: `Insufficient tacos. You have ${user.redeemable} but need ${reward.cost}.`,
        },
        { status: 400 }
      );
    }

    // Check quantity if applicable
    if (reward.quantity !== null && reward.quantity <= 0) {
      return NextResponse.json(
        { error: "This reward is out of stock" },
        { status: 400 }
      );
    }

    // Process redemption in a transaction
    const redemption = await prisma.$transaction(async (tx) => {
      // Deduct redeemable tacos from user
      await tx.user.update({
        where: { id: userId },
        data: { redeemable: { decrement: reward.cost } },
      });

      // Decrement reward quantity if applicable
      if (reward.quantity !== null) {
        await tx.reward.update({
          where: { id: rewardId },
          data: { quantity: { decrement: 1 } },
        });
      }

      // Create redemption record
      const newRedemption = await tx.redemption.create({
        data: {
          userId,
          rewardId,
          teamId,
          status: "pending",
        },
        include: {
          user: {
            select: { name: true, displayName: true, avatarUrl: true },
          },
          reward: {
            select: { title: true, cost: true },
          },
        },
      });

      return newRedemption;
    });

    return NextResponse.json(redemption, { status: 201 });
  } catch (error) {
    console.error("Error creating redemption:", error);
    return NextResponse.json(
      { error: "Failed to create redemption" },
      { status: 500 }
    );
  }
}
