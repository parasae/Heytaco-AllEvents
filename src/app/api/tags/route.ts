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

    const tags = await prisma.tag.findMany({
      where: { teamId },
      include: {
        _count: {
          select: { tacoTags: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const tagsWithCount = tags.map((tag: { id: string; name: string; description: string | null; color: string; teamId: string; _count: { tacoTags: number } }) => ({
      id: tag.id,
      name: tag.name,
      description: tag.description,
      color: tag.color,
      teamId: tag.teamId,
      count: tag._count.tacoTags,
    }));

    return NextResponse.json(tagsWithCount);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color, teamId } = body;

    if (!name || !teamId) {
      return NextResponse.json(
        { error: "name and teamId are required" },
        { status: 400 }
      );
    }

    // Check for duplicate tag name
    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: "A tag with this name already exists" },
        { status: 409 }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        description: description || null,
        color: color || "#F59E0B",
        teamId,
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id query parameter is required" },
        { status: 400 }
      );
    }

    await prisma.tag.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}
