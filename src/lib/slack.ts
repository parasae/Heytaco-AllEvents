import { App } from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import prisma from "@/lib/prisma";
import { DEFAULT_DAILY_LIMIT, MAX_TACOS_PER_MESSAGE, TACO_EMOJI } from "@/lib/constants";
import { Prisma } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Singleton Slack App (HTTP / Events API mode - no socket mode)
// ---------------------------------------------------------------------------

let slackApp: App | null = null;

export function getSlackApp(): App {
  if (slackApp) return slackApp;

  slackApp = new App({
    token: process.env.SLACK_BOT_TOKEN!,
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: false,
  });

  return slackApp;
}

export function getSlackClient(): WebClient {
  return new WebClient(process.env.SLACK_BOT_TOKEN!);
}

// ---------------------------------------------------------------------------
// Parsed mention result
// ---------------------------------------------------------------------------

export interface ParsedTacoMessage {
  mentions: string[]; // Slack user IDs (without angle brackets)
  tacoCount: number; // Total taco emojis found per mention
  message: string; // Remaining message text (cleaned)
}

// ---------------------------------------------------------------------------
// parseTokenMessage
// Accepts messages like:
//   "<@U12345> :taco: :taco: great work!"
//   "<@U12345> <@U67890> :taco:"
//   "<@U12345> \uD83C\uDF2E\uD83C\uDF2E thanks"
// ---------------------------------------------------------------------------

export function parseTacoMessage(text: string): ParsedTacoMessage {
  // 1. Extract all user mentions  <@UXXXXXXX>  or  <@UXXXXXXX|name>
  const mentionRegex = /<@([A-Z0-9]+)(?:\|[^>]*)?>/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    const userId = match[1];
    if (!mentions.includes(userId)) {
      mentions.push(userId);
    }
  }

  // 2. Count taco emojis (both Slack shortcode and Unicode)
  const slackTacoPattern = /:taco:/g;
  const unicodeTacoPattern = /\uD83C\uDF2E/g;

  const slackMatches = text.match(slackTacoPattern);
  const unicodeMatches = text.match(unicodeTacoPattern);

  let tacoCount = (slackMatches?.length ?? 0) + (unicodeMatches?.length ?? 0);

  // Cap at the per-message max
  if (tacoCount > MAX_TACOS_PER_MESSAGE) {
    tacoCount = MAX_TACOS_PER_MESSAGE;
  }

  // Default to 1 taco if mentions exist but no explicit taco emojis
  // (Only if at least one mention exists -- prevents false positives)
  if (mentions.length > 0 && tacoCount === 0) {
    tacoCount = 0; // Require explicit taco emoji
  }

  // 3. Build a cleaned-up message (strip mentions & taco emojis)
  let message = text
    .replace(mentionRegex, "")
    .replace(slackTacoPattern, "")
    .replace(unicodeTacoPattern, "")
    .trim();

  return { mentions, tacoCount, message };
}

// Alias for backwards compat / alternate naming
export const parseTokenMessage = parseTacoMessage;

// ---------------------------------------------------------------------------
// sendTacoNotification
// Posts a rich Block Kit message to a Slack channel celebrating the taco gift.
// ---------------------------------------------------------------------------

export async function sendTacoNotification(
  channel: string,
  giverSlackId: string,
  receiverSlackId: string,
  count: number,
  message: string,
  client?: WebClient
): Promise<void> {
  const slack = client ?? getSlackClient();
  const tacoString = TACO_EMOJI.repeat(count);

  const blocks = [
    {
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: `${tacoString}  <@${giverSlackId}> gave ${count} taco${count > 1 ? "s" : ""} to <@${receiverSlackId}>!`,
      },
    },
  ];

  if (message) {
    blocks.push({
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: `> _${message}_`,
      },
    });
  }

  await slack.chat.postMessage({
    channel,
    text: `${tacoString} <@${giverSlackId}> gave ${count} taco${count > 1 ? "s" : ""} to <@${receiverSlackId}>!`,
    blocks,
  });
}

// ---------------------------------------------------------------------------
// getRemainingTacos
// Returns how many tacos the user can still give today.
// ---------------------------------------------------------------------------

export async function getRemainingTacos(
  userId: string,
  teamId: string
): Promise<{ remaining: number; limit: number; given: number }> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Check team settings for custom limit
  const teamSettings = await prisma.teamSettings.findUnique({
    where: { teamId },
  });
  const dailyLimit = teamSettings?.dailyTacoLimit ?? DEFAULT_DAILY_LIMIT;

  // Check the user's daily tracker
  const tracker = await prisma.dailyTacoTracker.findUnique({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
  });

  const given = tracker?.tacosGiven ?? 0;
  const remaining = Math.max(0, dailyLimit - given);

  return { remaining, limit: dailyLimit, given };
}

// ---------------------------------------------------------------------------
// findOrCreateUser
// Looks up a user by Slack ID, creating them from the Slack profile if needed.
// ---------------------------------------------------------------------------

export async function findOrCreateUser(
  slackUserId: string,
  teamId: string,
  slackClient?: WebClient
) {
  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { slackId: slackUserId },
  });

  if (existing) return existing;

  // Fetch profile from Slack
  const client = slackClient ?? getSlackClient();
  const info = await client.users.info({ user: slackUserId });
  const profile = info.user?.profile;

  const name =
    info.user?.real_name ?? profile?.real_name ?? info.user?.name ?? slackUserId;
  const displayName =
    profile?.display_name || profile?.real_name || name;

  const user = await prisma.user.create({
    data: {
      slackId: slackUserId,
      teamId,
      name,
      displayName,
      email: profile?.email ?? null,
      avatarUrl:
        profile?.image_192 ?? profile?.image_72 ?? profile?.image_48 ?? null,
    },
  });

  return user;
}

// ---------------------------------------------------------------------------
// Slack request verification helper
// Verifies the x-slack-signature / x-slack-request-timestamp headers
// against the signing secret.
// ---------------------------------------------------------------------------

import crypto from "crypto";

export function verifySlackRequest(
  signingSecret: string,
  requestTimestamp: string,
  body: string,
  slackSignature: string
): boolean {
  // Reject requests older than 5 minutes to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(requestTimestamp, 10)) > 60 * 5) {
    return false;
  }

  const sigBasestring = `v0:${requestTimestamp}:${body}`;
  const mySignature =
    "v0=" +
    crypto
      .createHmac("sha256", signingSecret)
      .update(sigBasestring, "utf8")
      .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(mySignature, "utf8"),
    Buffer.from(slackSignature, "utf8")
  );
}

// ---------------------------------------------------------------------------
// recordTacoGift
// Centralized logic to record a taco transaction in the database.
// Updates User stats, creates Taco record, and updates DailyTacoTracker.
// ---------------------------------------------------------------------------

export async function recordTacoGift(params: {
  giverId: string; // Internal DB id
  receiverId: string; // Internal DB id
  amount: number;
  message?: string;
  channel?: string;
  channelName?: string;
  teamId: string;
}) {
  const { giverId, receiverId, amount, message, channel, channelName, teamId } =
    params;
  const today = new Date().toISOString().slice(0, 10);

  // Use a transaction to keep everything consistent
  const taco = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Create the taco record
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
    });

    // 2. Update giver stats
    await tx.user.update({
      where: { id: giverId },
      data: { totalGiven: { increment: amount } },
    });

    // 3. Update receiver stats
    await tx.user.update({
      where: { id: receiverId },
      data: {
        totalReceived: { increment: amount },
        redeemable: { increment: amount },
      },
    });

    // 4. Update daily tracker for giver
    await tx.dailyTacoTracker.upsert({
      where: {
        userId_date: {
          userId: giverId,
          date: today,
        },
      },
      update: { tacosGiven: { increment: amount } },
      create: {
        userId: giverId,
        date: today,
        tacosGiven: amount,
      },
    });

    return newTaco;
  });

  return taco;
}
