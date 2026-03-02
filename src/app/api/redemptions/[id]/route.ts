import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const validStatuses = ["pending", "fulfilled", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "status must be one of: pending, fulfilled, cancelled" },
        { status: 400 }
      );
    }

    const redemption = await prisma.redemption.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true },
        },
        reward: {
          select: { id: true, title: true, cost: true },
        },
      },
    });

    return NextResponse.json(redemption);
  } catch (error) {
    console.error("Error updating redemption:", error);
    return NextResponse.json(
      { error: "Failed to update redemption" },
      { status: 500 }
    );
  }
}
