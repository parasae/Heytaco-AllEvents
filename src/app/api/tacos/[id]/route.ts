import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminOrError = await requireAdmin();
  if (adminOrError instanceof NextResponse) return adminOrError;

  const { id } = await params;

  try {
    const taco = await prisma.taco.findUnique({ where: { id } });
    if (!taco) {
      return NextResponse.json({ error: "Taco not found" }, { status: 404 });
    }

    // Atomically delete taco and reverse all stats
    await prisma.$transaction(async (tx) => {
      // Delete taco (TacoTag rows cascade automatically)
      await tx.taco.delete({ where: { id } });

      // Reverse giver stats
      await tx.user.update({
        where: { id: taco.giverId },
        data: { totalGiven: { decrement: taco.amount } },
      });

      // Reverse receiver stats
      await tx.user.update({
        where: { id: taco.receiverId },
        data: {
          totalReceived: { decrement: taco.amount },
          redeemable: { decrement: taco.amount },
        },
      });

      // Reverse daily tracker for the giver on the day the taco was given
      const date = taco.createdAt.toISOString().split("T")[0];
      await tx.dailyTacoTracker.updateMany({
        where: { userId: taco.giverId, date },
        data: { tacosGiven: { decrement: taco.amount } },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting taco:", error);
    return NextResponse.json(
      { error: "Failed to delete taco" },
      { status: 500 }
    );
  }
}
