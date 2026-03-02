import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botToken, signingSecret } = body;

    if (!botToken || !signingSecret) {
      return NextResponse.json(
        { connected: false, error: "botToken and signingSecret are required" },
        { status: 400 }
      );
    }

    const response = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!data.ok) {
      return NextResponse.json(
        { connected: false, error: data.error || "Slack authentication failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      connected: true,
      team: data.team,
      user: data.user,
    });
  } catch (error) {
    console.error("Error testing Slack connection:", error);
    return NextResponse.json(
      { connected: false, error: "Failed to test Slack connection" },
      { status: 400 }
    );
  }
}
