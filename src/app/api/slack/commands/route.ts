import { NextRequest, NextResponse } from "next/server";
import {
  verifySlackRequest,
  findOrCreateUser,
  getRemainingTacos,
  parseTacoMessage,
  recordTacoGift,
  getSlackClient,
} from "@/lib/slack";
import {
  buildLeaderboardBlocks,
  buildStatsBlocks,
  buildHelpBlocks,
  buildTacoGivenBlocks,
  buildErrorBlocks,
  type LeaderboardBlockEntry,
} from "@/lib/slack-blocks";
import prisma from "@/lib/prisma";
import { TACO_EMOJI } from "@/lib/constants";

// ---------------------------------------------------------------------------
// POST /api/slack/commands
// Handles slash commands: /tacotime (or /tt)
// Slack sends slash command payloads as application/x-www-form-urlencoded.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-slack-request-timestamp") ?? "";
  const signature = request.headers.get("x-slack-signature") ?? "";

  // ---- Verify request signature ----
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error("[slack/commands] SLACK_SIGNING_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  if (!verifySlackRequest(signingSecret, timestamp, rawBody, signature)) {
    console.warn("[slack/commands] Invalid Slack signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ---- Parse the form body ----
  const params = new URLSearchParams(rawBody);
  const commandText = (params.get("text") ?? "").trim();
  const userSlackId = params.get("user_id") ?? "";
  const teamId = params.get("team_id") ?? "";
  const channelId = params.get("channel_id") ?? "";

  // Determine the subcommand
  const [subcommand, ...rest] = commandText.split(/\s+/);
  const args = rest.join(" ");

  try {
    switch (subcommand.toLowerCase()) {
      case "leaderboard":
      case "lb":
        return await handleLeaderboard(args, teamId);

      case "my-tacos":
      case "mytacos":
      case "me":
      case "stats":
        return await handleMyTacos(userSlackId, teamId);

      case "give":
        return await handleGive(userSlackId, args, teamId, channelId);

      case "help":
      case "":
        return handleHelp();

      default:
        return buildSlackResponse(
          buildErrorBlocks(
            `Unknown command: \`${subcommand}\`. Try \`/tacotime help\` for a list of commands.`
          ),
          true
        );
    }
  } catch (err) {
    console.error("[slack/commands] Error handling command:", err);
    return buildSlackResponse(
      buildErrorBlocks(
        "Something went wrong processing your command. Please try again!"
      ),
      true
    );
  }
}

// ---------------------------------------------------------------------------
// Subcommand handlers
// ---------------------------------------------------------------------------

async function handleLeaderboard(
  args: string,
  teamId: string
): Promise<NextResponse> {
  // Determine the period
  const periodArg = args.trim().toLowerCase();
  let periodLabel: string;
  let dateFilter: Date | undefined;

  const now = new Date();

  switch (periodArg) {
    case "week":
    case "weekly":
      periodLabel = "This Week";
      dateFilter = new Date(now);
      dateFilter.setDate(dateFilter.getDate() - 7);
      break;
    case "all":
    case "all-time":
    case "alltime":
      periodLabel = "All Time";
      dateFilter = undefined;
      break;
    case "month":
    case "monthly":
    default:
      periodLabel = "This Month";
      dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  let entries: LeaderboardBlockEntry[];

  if (dateFilter) {
    // Aggregate tacos received in the period
    const results = await prisma.taco.groupBy({
      by: ["receiverId"],
      where: {
        teamId,
        createdAt: { gte: dateFilter },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    });

    // Fetch user details
    const userIds = results.map((r: { receiverId: string }) => r.receiverId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
    });
    const userMap = new Map(
      users.map((u: { id: string; displayName: string; slackId: string }) => [
        u.id,
        u,
      ])
    );

    entries = results.map(
      (
        r: { receiverId: string; _sum: { amount: number | null } },
        idx: number
      ) => {
        const user = userMap.get(r.receiverId) as
          | { displayName: string; slackId: string }
          | undefined;
        return {
          rank: idx + 1,
          displayName: user?.displayName ?? "Unknown",
          slackId: user?.slackId,
          count: r._sum.amount ?? 0,
        };
      }
    );
  } else {
    // All-time: use the totalReceived field on User
    const topUsers = await prisma.user.findMany({
      where: { teamId, isActive: true },
      orderBy: { totalReceived: "desc" },
      take: 5,
    });

    entries = topUsers.map(
      (
        u: {
          displayName: string;
          slackId: string;
          totalReceived: number;
        },
        idx: number
      ) => ({
        rank: idx + 1,
        displayName: u.displayName,
        slackId: u.slackId,
        count: u.totalReceived,
      })
    );
  }

  const blocks = buildLeaderboardBlocks(
    entries,
    `${TACO_EMOJI} Taco Leaderboard`,
    periodLabel
  );

  return buildSlackResponse(blocks, false);
}

async function handleMyTacos(
  userSlackId: string,
  teamId: string
): Promise<NextResponse> {
  const client = getSlackClient();
  const user = await findOrCreateUser(userSlackId, teamId, client);
  const dailyStats = await getRemainingTacos(user.id, teamId);

  const blocks = buildStatsBlocks(
    {
      displayName: user.displayName,
      slackId: user.slackId,
      totalReceived: user.totalReceived,
      totalGiven: user.totalGiven,
      redeemable: user.redeemable,
    },
    {
      tacosGiven: dailyStats.given,
      tacosRemaining: dailyStats.remaining,
      dailyLimit: dailyStats.limit,
    }
  );

  return buildSlackResponse(blocks, true); // Ephemeral - only visible to user
}

async function handleGive(
  giverSlackId: string,
  args: string,
  teamId: string,
  channelId: string
): Promise<NextResponse> {
  const client = getSlackClient();

  // Parse the args for mentions and an optional message
  // Expected format: "@user [optional message]" or "<@U12345> [optional message]"
  const parsed = parseTacoMessage(args);

  if (parsed.mentions.length === 0) {
    return buildSlackResponse(
      buildErrorBlocks(
        "Please mention someone to give a taco to!\nUsage: `/tacotime give @someone Great job!`"
      ),
      true
    );
  }

  // Default to 1 taco for slash command give
  const tacoCount = parsed.tacoCount > 0 ? parsed.tacoCount : 1;

  const giver = await findOrCreateUser(giverSlackId, teamId, client);

  const results: string[] = [];

  for (const receiverSlackId of parsed.mentions) {
    // Cannot give to yourself
    if (receiverSlackId === giverSlackId) {
      results.push(":no_entry_sign: You can't give tacos to yourself!");
      continue;
    }

    // Check if receiver is a bot
    try {
      const userInfo = await client.users.info({ user: receiverSlackId });
      if (userInfo.user?.is_bot || userInfo.user?.id === "USLACKBOT") {
        results.push(":robot_face: Bots don't eat tacos!");
        continue;
      }
    } catch {
      results.push(`:warning: Could not find user <@${receiverSlackId}>.`);
      continue;
    }

    // Check daily limit
    const { remaining } = await getRemainingTacos(giver.id, teamId);
    if (remaining <= 0) {
      results.push(
        `:sleeping: You've used all your tacos for today! Come back tomorrow.`
      );
      break;
    }

    const actualCount = Math.min(tacoCount, remaining);
    const receiver = await findOrCreateUser(receiverSlackId, teamId, client);

    // Get channel name
    let channelName: string | undefined;
    try {
      const channelInfo = await client.conversations.info({
        channel: channelId,
      });
      channelName = (channelInfo.channel as Record<string, unknown>)?.name as string | undefined;
    } catch {
      // Non-critical
    }

    await recordTacoGift({
      giverId: giver.id,
      receiverId: receiver.id,
      amount: actualCount,
      message: parsed.message || undefined,
      channel: channelId,
      channelName,
      teamId,
    });

    // Post a public message in the channel
    const blocks = buildTacoGivenBlocks(
      giver.displayName,
      giver.slackId,
      receiver.displayName,
      receiver.slackId,
      actualCount,
      parsed.message
    );

    await client.chat.postMessage({
      channel: channelId,
      text: `${TACO_EMOJI.repeat(actualCount)} ${giver.displayName} gave ${actualCount} taco${actualCount > 1 ? "s" : ""} to ${receiver.displayName}!`,
      blocks,
    });

    // DM the receiver
    try {
      const dmChannel = await client.conversations.open({
        users: receiverSlackId,
      });
      if (dmChannel.channel?.id) {
        await client.chat.postMessage({
          channel: dmChannel.channel.id,
          text: `${TACO_EMOJI} You received ${actualCount} taco${actualCount > 1 ? "s" : ""} from <@${giverSlackId}>!${parsed.message ? ` "${parsed.message}"` : ""}`,
        });
      }
    } catch {
      // DM failure is non-critical
    }

    results.push(
      `${TACO_EMOJI.repeat(actualCount)} Gave ${actualCount} taco${actualCount > 1 ? "s" : ""} to <@${receiverSlackId}>!`
    );
  }

  return buildSlackResponse(
    [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: results.join("\n"),
        },
      },
    ],
    true // ephemeral confirmation to giver
  );
}

function handleHelp(): NextResponse {
  return buildSlackResponse(buildHelpBlocks(), true);
}

// ---------------------------------------------------------------------------
// Helper: build a Slack slash command JSON response
// ---------------------------------------------------------------------------

function buildSlackResponse(
  blocks: Record<string, unknown>[],
  ephemeral: boolean
): NextResponse {
  return NextResponse.json({
    response_type: ephemeral ? "ephemeral" : "in_channel",
    blocks,
  });
}
