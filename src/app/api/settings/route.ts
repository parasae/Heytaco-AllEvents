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

    let settings = await prisma.teamSettings.findUnique({
      where: { teamId },
    });

    // If no settings exist, create defaults
    if (!settings) {
      settings = await prisma.teamSettings.create({
        data: { teamId },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, ...updateData } = body;

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 }
      );
    }

    const allowedFields = [
      "teamName",
      "dailyTacoLimit",
      "leaderboardEnabled",
      "reactionsEnabled",
      "giverModeEnabled",
      "tacoEmoji",
      "welcomeMessage",
      "slackBotToken",
      "slackSigningSecret",
      "slackClientId",
      "slackClientSecret",
    ];

    const filteredData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    const settings = await prisma.teamSettings.upsert({
      where: { teamId },
      update: filteredData,
      create: { teamId, ...filteredData },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
