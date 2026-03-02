import { NextRequest, NextResponse } from "next/server";
import {
  verifySlackRequest,
  parseTacoMessage,
  findOrCreateUser,
  getRemainingTacos,
  sendTacoNotification,
  recordTacoGift,
  getSlackClient,
} from "@/lib/slack";
import {
  buildTacoGivenBlocks,
  buildHelpBlocks,
  buildWelcomeBlocks,
} from "@/lib/slack-blocks";
import prisma from "@/lib/prisma";
import { TACO_EMOJI, APP_NAME } from "@/lib/constants";

// ---------------------------------------------------------------------------
// POST /api/slack/events
// Handles the Slack Events API webhook.
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-slack-request-timestamp") ?? "";
  const signature = request.headers.get("x-slack-signature") ?? "";

  // ---- URL verification challenge (Slack sends this on initial setup) ----
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Respond to Slack's URL verification immediately (before signature check)
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  // ---- Verify request signature ----
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error("[slack/events] SLACK_SIGNING_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  if (!verifySlackRequest(signingSecret, timestamp, rawBody, signature)) {
    console.warn("[slack/events] Invalid Slack signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ---- Acknowledge immediately, then process asynchronously ----
  // Slack expects a 200 within 3 seconds. We kick off the handler but don't
  // await it so the response goes back quickly.
  const event = body.event as Record<string, unknown> | undefined;
  const teamId = (body.team_id as string) ?? "";

  if (event) {
    // Fire-and-forget (errors are logged internally)
    handleEvent(event, teamId).catch((err) =>
      console.error("[slack/events] Unhandled error processing event:", err)
    );
  }

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Event dispatcher
// ---------------------------------------------------------------------------

async function handleEvent(
  event: Record<string, unknown>,
  teamId: string
): Promise<void> {
  const eventType = event.type as string;

  switch (eventType) {
    case "message":
      await handleMessageEvent(event, teamId);
      break;
    case "app_mention":
      await handleAppMentionEvent(event, teamId);
      break;
    case "reaction_added":
      await handleReactionAddedEvent(event, teamId);
      break;
    case "team_join":
      await handleTeamJoinEvent(event, teamId);
      break;
    default:
      // Unhandled event type - ignore silently
      break;
  }
}

// ---------------------------------------------------------------------------
// Message event handler
// Parses for taco emoji patterns and records gifts.
// ---------------------------------------------------------------------------

async function handleMessageEvent(
  event: Record<string, unknown>,
  teamId: string
): Promise<void> {
  const client = getSlackClient();

  // Ignore bot messages, message_changed, etc.
  const subtype = event.subtype as string | undefined;
  if (subtype) return;

  const text = (event.text as string) ?? "";
  const senderSlackId = event.user as string;
  const channel = event.channel as string;

  if (!senderSlackId || !channel) return;

  // Parse for taco patterns
  const parsed = parseTacoMessage(text);
  if (parsed.mentions.length === 0 || parsed.tacoCount === 0) return;

  // Look up channel info for the channel name
  let channelName: string | undefined;
  try {
    const channelInfo = await client.conversations.info({ channel });
    channelName = (channelInfo.channel as Record<string, unknown>)?.name as string | undefined;
  } catch {
    // Non-critical; we can proceed without it
  }

  // Find or create the giver
  const giver = await findOrCreateUser(senderSlackId, teamId, client);

  // Process each mentioned user
  for (const mentionedSlackId of parsed.mentions) {
    // --- Validation ---

    // Cannot give tacos to yourself
    if (mentionedSlackId === senderSlackId) {
      await client.chat.postEphemeral({
        channel,
        user: senderSlackId,
        text: `${TACO_EMOJI} Nice try! You can't give tacos to yourself. Share the love with someone else!`,
      });
      continue;
    }

    // Check if the mentioned user is a bot
    try {
      const userInfo = await client.users.info({ user: mentionedSlackId });
      if (userInfo.user?.is_bot || userInfo.user?.id === "USLACKBOT") {
        await client.chat.postEphemeral({
          channel,
          user: senderSlackId,
          text: `${TACO_EMOJI} Bots don't eat tacos! Try giving one to a real human. :robot_face:`,
        });
        continue;
      }
    } catch {
      // If we can't look up the user, skip them
      continue;
    }

    // Check daily limit
    const { remaining } = await getRemainingTacos(giver.id, teamId);
    if (remaining <= 0) {
      await client.chat.postEphemeral({
        channel,
        user: senderSlackId,
        text: `${TACO_EMOJI} You've used all your tacos for today! Your taco supply refreshes tomorrow. Come back then! :sleeping:`,
      });
      return; // Stop processing further mentions
    }

    // Cap the taco count to the user's remaining allowance
    const actualCount = Math.min(parsed.tacoCount, remaining);

    // Find or create the receiver
    const receiver = await findOrCreateUser(mentionedSlackId, teamId, client);

    // --- Record the taco gift ---
    await recordTacoGift({
      giverId: giver.id,
      receiverId: receiver.id,
      amount: actualCount,
      message: parsed.message || undefined,
      channel,
      channelName,
      teamId,
    });

    // --- Send confirmation message to channel ---
    const blocks = buildTacoGivenBlocks(
      giver.displayName,
      giver.slackId,
      receiver.displayName,
      receiver.slackId,
      actualCount,
      parsed.message
    );

    await client.chat.postMessage({
      channel,
      text: `${TACO_EMOJI.repeat(actualCount)} ${giver.displayName} gave ${actualCount} taco${actualCount > 1 ? "s" : ""} to ${receiver.displayName}!`,
      blocks,
    });

    // --- DM the receiver ---
    try {
      const dmChannel = await client.conversations.open({
        users: mentionedSlackId,
      });

      if (dmChannel.channel?.id) {
        // Check if this is a brand new user (just created moments ago)
        const isNewUser =
          new Date().getTime() - new Date(receiver.createdAt).getTime() < 60000;

        if (isNewUser) {
          // Send welcome message first
          await client.chat.postMessage({
            channel: dmChannel.channel.id,
            text: `Welcome to ${APP_NAME}, ${receiver.displayName}!`,
            blocks: buildWelcomeBlocks(receiver.displayName),
          });
        }

        const updatedReceiver = await prisma.user.findUnique({
          where: { id: receiver.id },
        });

        await client.chat.postMessage({
          channel: dmChannel.channel.id,
          text: `${TACO_EMOJI} You received ${actualCount} taco${actualCount > 1 ? "s" : ""} from ${giver.displayName}!`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `${TACO_EMOJI.repeat(actualCount)} *You received ${actualCount} taco${actualCount > 1 ? "s" : ""} from <@${giver.slackId}>!*`,
              },
            },
            ...(parsed.message
              ? [
                  {
                    type: "section" as const,
                    text: {
                      type: "mrkdwn" as const,
                      text: `> _"${parsed.message}"_`,
                    },
                  },
                ]
              : []),
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `Your total: *${updatedReceiver?.totalReceived ?? receiver.totalReceived + actualCount}* tacos received | *${updatedReceiver?.redeemable ?? receiver.redeemable + actualCount}* redeemable`,
                },
              ],
            },
          ],
        });
      }
    } catch (err) {
      console.error("[slack/events] Failed to DM receiver:", err);
      // Non-critical - continue
    }

    // If we capped the count, let the giver know
    if (actualCount < parsed.tacoCount) {
      await client.chat.postEphemeral({
        channel,
        user: senderSlackId,
        text: `${TACO_EMOJI} You only had ${actualCount} taco${actualCount > 1 ? "s" : ""} remaining today, so that's how many were given. Your supply refreshes tomorrow!`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// App mention event handler
// Responds with help text when the bot is @mentioned.
// ---------------------------------------------------------------------------

async function handleAppMentionEvent(
  event: Record<string, unknown>,
  _teamId: string
): Promise<void> {
  const client = getSlackClient();
  const channel = event.channel as string;

  if (!channel) return;

  await client.chat.postMessage({
    channel,
    text: `${TACO_EMOJI} Hey there! I'm ${APP_NAME} \u2014 here to help you celebrate your teammates!`,
    blocks: buildHelpBlocks(),
  });
}

// ---------------------------------------------------------------------------
// Reaction added event handler
// If someone reacts with :taco:, give 1 taco to the message author.
// ---------------------------------------------------------------------------

async function handleReactionAddedEvent(
  event: Record<string, unknown>,
  teamId: string
): Promise<void> {
  const client = getSlackClient();
  const reaction = event.reaction as string;

  // Only process taco reactions
  if (reaction !== "taco") return;

  const reactorSlackId = event.user as string;
  const item = event.item as Record<string, unknown> | undefined;

  if (!item || item.type !== "message") return;

  const channel = item.channel as string;
  const messageTs = item.ts as string;

  if (!channel || !messageTs) return;

  // Fetch the original message to find the author
  let messageAuthorSlackId: string | undefined;
  try {
    const result = await client.conversations.history({
      channel,
      latest: messageTs,
      inclusive: true,
      limit: 1,
    });

    const messages = result.messages;
    if (messages && messages.length > 0) {
      messageAuthorSlackId = messages[0].user;
    }
  } catch (err) {
    console.error("[slack/events] Failed to fetch message for reaction:", err);
    return;
  }

  if (!messageAuthorSlackId) return;

  // Cannot give tacos to yourself
  if (reactorSlackId === messageAuthorSlackId) return;

  // Check if the author is a bot
  try {
    const userInfo = await client.users.info({ user: messageAuthorSlackId });
    if (userInfo.user?.is_bot || userInfo.user?.id === "USLACKBOT") return;
  } catch {
    return;
  }

  // Find or create both users
  const giver = await findOrCreateUser(reactorSlackId, teamId, client);
  const receiver = await findOrCreateUser(messageAuthorSlackId, teamId, client);

  // Check daily limit
  const { remaining } = await getRemainingTacos(giver.id, teamId);
  if (remaining <= 0) {
    // Send ephemeral to the reactor
    try {
      await client.chat.postEphemeral({
        channel,
        user: reactorSlackId,
        text: `${TACO_EMOJI} You've used all your tacos for today! Your supply refreshes tomorrow.`,
      });
    } catch {
      // Ephemeral failures are non-critical
    }
    return;
  }

  // Get channel name
  let channelName: string | undefined;
  try {
    const channelInfo = await client.conversations.info({ channel });
    channelName = (channelInfo.channel as Record<string, unknown>)?.name as string | undefined;
  } catch {
    // Non-critical
  }

  // Record the gift
  await recordTacoGift({
    giverId: giver.id,
    receiverId: receiver.id,
    amount: 1,
    message: "Taco reaction",
    channel,
    channelName,
    teamId,
  });

  // Notify in channel
  await sendTacoNotification(
    channel,
    reactorSlackId,
    messageAuthorSlackId,
    1,
    "via :taco: reaction",
    client
  );

  // DM the receiver
  try {
    const dmChannel = await client.conversations.open({
      users: messageAuthorSlackId,
    });

    if (dmChannel.channel?.id) {
      await client.chat.postMessage({
        channel: dmChannel.channel.id,
        text: `${TACO_EMOJI} <@${reactorSlackId}> reacted with :taco: to your message \u2014 you got 1 taco!`,
      });
    }
  } catch {
    // DM failure is non-critical
  }
}

// ---------------------------------------------------------------------------
// Team join event handler
// Welcomes new team members with a DM when they join the workspace.
// ---------------------------------------------------------------------------

async function handleTeamJoinEvent(
  event: Record<string, unknown>,
  teamId: string
): Promise<void> {
  const client = getSlackClient();
  const newUser = event.user as Record<string, unknown> | undefined;

  if (!newUser) return;

  const slackUserId = newUser.id as string;
  if (!slackUserId) return;

  // Skip bots
  if (newUser.is_bot) return;

  // Create the user in our database
  const user = await findOrCreateUser(slackUserId, teamId, client);

  // Send a welcome DM
  try {
    const dmChannel = await client.conversations.open({
      users: slackUserId,
    });

    if (dmChannel.channel?.id) {
      await client.chat.postMessage({
        channel: dmChannel.channel.id,
        text: `Welcome to ${APP_NAME}, ${user.displayName}!`,
        blocks: buildWelcomeBlocks(user.displayName),
      });
    }
  } catch (err) {
    console.error("[slack/events] Failed to send welcome DM:", err);
  }
}
