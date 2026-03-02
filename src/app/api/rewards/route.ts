import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 }
      );
    }

    const rewards = await prisma.reward.findMany({
      where: { teamId, isActive: true },
      orderBy: { cost: "asc" },
    });

    return NextResponse.json(rewards);
  } catch (error) {
    console.error("Error fetching rewards:", error);
    return NextResponse.json(
      { error: "Failed to fetch rewards" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, cost, quantity, imageUrl, type, teamId } = body;

    if (!title || cost === undefined || !teamId) {
      return NextResponse.json(
        { error: "title, cost, and teamId are required" },
        { status: 400 }
      );
    }

    if (cost < 1) {
      return NextResponse.json(
        { error: "Cost must be at least 1" },
        { status: 400 }
      );
    }

    const reward = await prisma.reward.create({
      data: {
        title,
        description: description || null,
        cost,
        quantity: quantity ?? null,
        imageUrl: imageUrl || null,
        type: type || "custom",
        teamId,
      },
    });

    return NextResponse.json(reward, { status: 201 });
  } catch (error) {
    console.error("Error creating reward:", error);
    return NextResponse.json(
      { error: "Failed to create reward" },
      { status: 500 }
    );
  }
}
