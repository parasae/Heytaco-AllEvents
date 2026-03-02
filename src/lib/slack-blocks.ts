import { TACO_EMOJI, APP_NAME } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Type helpers for Slack Block Kit
// ---------------------------------------------------------------------------

type TextObject = {
  type: "mrkdwn" | "plain_text";
  text: string;
  emoji?: boolean;
};

type SectionBlock = {
  type: "section";
  text?: TextObject;
  fields?: TextObject[];
  accessory?: Record<string, unknown>;
};

type DividerBlock = {
  type: "divider";
};

type ContextBlock = {
  type: "context";
  elements: (TextObject | { type: "image"; image_url: string; alt_text: string })[];
};

type HeaderBlock = {
  type: "header";
  text: TextObject;
};

type ActionsBlock = {
  type: "actions";
  elements: Record<string, unknown>[];
};

type SlackBlock =
  | SectionBlock
  | DividerBlock
  | ContextBlock
  | HeaderBlock
  | ActionsBlock;

// ---------------------------------------------------------------------------
// buildTacoGivenBlocks
// Rich celebration message when someone gives tacos.
// ---------------------------------------------------------------------------

export function buildTacoGivenBlocks(
  giverName: string,
  giverSlackId: string,
  receiverName: string,
  receiverSlackId: string,
  count: number,
  message?: string | null,
  tags?: string[]
): SlackBlock[] {
  const tacoString = TACO_EMOJI.repeat(count);
  const celebration = getCelebrationText(count);

  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${tacoString}  *<@${giverSlackId}>* gave *${count}* taco${count > 1 ? "s" : ""} to *<@${receiverSlackId}>*! ${celebration}`,
      },
    },
  ];

  if (message) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `> _"${message}"_`,
      },
    });
  }

  if (tags && tags.length > 0) {
    const tagStr = tags.map((t) => `\`#${t}\``).join("  ");
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `${TACO_EMOJI} Tags: ${tagStr}`,
        },
      ],
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Powered by *${APP_NAME}* | Give tacos to recognize your teammates!`,
      },
    ],
  });

  return blocks;
}

// ---------------------------------------------------------------------------
// buildLeaderboardBlocks
// Formatted leaderboard with rank medals.
// ---------------------------------------------------------------------------

export interface LeaderboardBlockEntry {
  rank: number;
  displayName: string;
  slackId?: string;
  count: number;
}

export function buildLeaderboardBlocks(
  entries: LeaderboardBlockEntry[],
  title: string,
  period: string
): SlackBlock[] {
  const rankEmojis: Record<number, string> = {
    1: ":first_place_medal:",
    2: ":second_place_medal:",
    3: ":third_place_medal:",
  };

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${TACO_EMOJI} ${title}`,
        emoji: true,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Period: *${period}*`,
        },
      ],
    },
    { type: "divider" },
  ];

  if (entries.length === 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "_No tacos have been given yet! Be the first to spread some taco love._ :taco:",
      },
    });
    return blocks;
  }

  for (const entry of entries) {
    const medal = rankEmojis[entry.rank] ?? `*#${entry.rank}*`;
    const userDisplay = entry.slackId
      ? `<@${entry.slackId}>`
      : entry.displayName;
    const tacoBar = TACO_EMOJI.repeat(Math.min(entry.count, 10));

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${medal}  ${userDisplay}  \u2014  *${entry.count}* taco${entry.count !== 1 ? "s" : ""}\n${tacoBar}`,
      },
    });
  }

  blocks.push(
    { type: "divider" },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `${TACO_EMOJI} Keep giving tacos to climb the leaderboard! | *${APP_NAME}*`,
        },
      ],
    }
  );

  return blocks;
}

// ---------------------------------------------------------------------------
// buildStatsBlocks
// Personal stats card for a user.
// ---------------------------------------------------------------------------

export interface UserStatsData {
  displayName: string;
  slackId: string;
  totalReceived: number;
  totalGiven: number;
  redeemable: number;
}

export interface DailyStatsData {
  tacosGiven: number;
  tacosRemaining: number;
  dailyLimit: number;
}

export function buildStatsBlocks(
  user: UserStatsData,
  dailyStats: DailyStatsData
): SlackBlock[] {
  const progressBar = buildProgressBar(
    dailyStats.tacosGiven,
    dailyStats.dailyLimit
  );

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${TACO_EMOJI} Your Taco Stats`,
        emoji: true,
      },
    },
    { type: "divider" },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*${TACO_EMOJI} Received*\n${user.totalReceived} taco${user.totalReceived !== 1 ? "s" : ""}`,
        },
        {
          type: "mrkdwn",
          text: `*:gift: Given*\n${user.totalGiven} taco${user.totalGiven !== 1 ? "s" : ""}`,
        },
      ],
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*:moneybag: Redeemable*\n${user.redeemable} taco${user.redeemable !== 1 ? "s" : ""}`,
        },
        {
          type: "mrkdwn",
          text: `*:calendar: Today*\n${dailyStats.tacosRemaining} of ${dailyStats.dailyLimit} remaining`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Today's giving:* ${progressBar}`,
      },
    },
    { type: "divider" },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Use \`/tacotime give @someone reason\` to give tacos! | *${APP_NAME}*`,
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// buildHelpBlocks
// Help message listing all available commands.
// ---------------------------------------------------------------------------

export function buildHelpBlocks(): SlackBlock[] {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${TACO_EMOJI} ${APP_NAME} \u2014 Help`,
        emoji: true,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Give tacos in any channel:*\n`@someone :taco: Great job on the release!`\nYou can give multiple tacos: `@someone :taco: :taco: :taco:`",
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Slash commands:*",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "\u2022 `/tacotime leaderboard` \u2014 View the top taco receivers\n" +
          "\u2022 `/tacotime my-tacos` \u2014 Check your personal stats\n" +
          "\u2022 `/tacotime give @user [message]` \u2014 Give a taco to someone\n" +
          "\u2022 `/tacotime help` \u2014 Show this help message",
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Other ways to give tacos:*",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `\u2022 React to any message with ${TACO_EMOJI} to give 1 taco\n` +
          `\u2022 Use the ${TACO_EMOJI} emoji in your message alongside an @mention\n` +
          "\u2022 Give to multiple people at once: `@alice @bob :taco:`",
      },
    },
    { type: "divider" },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `:bulb: _Tip: You can also use \`/tt\` as a shortcut for \`/tacotime\`!_ | *${APP_NAME}*`,
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// buildWelcomeBlocks
// Welcome message for brand-new users.
// ---------------------------------------------------------------------------

export function buildWelcomeBlocks(userName: string): SlackBlock[] {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${TACO_EMOJI} Welcome to ${APP_NAME}, ${userName}!`,
        emoji: true,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `Hey ${userName}! :wave: Welcome to *${APP_NAME}* \u2014 the tastiest way to recognize your teammates!\n\n` +
          "Here\u2019s how it works:",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `${TACO_EMOJI}  *Give tacos* to teammates to say thanks, great job, or just to brighten their day!\n\n` +
          ":one:  Mention someone and add a taco emoji: `@teammate :taco: Thanks for the code review!`\n" +
          `:two:  Or use the slash command: \`/tacotime give @teammate You rock!\`\n` +
          `:three:  React to a message with ${TACO_EMOJI} to give 1 taco\n\n` +
          "_You get *5 tacos* to give out each day \u2014 use them wisely!_",
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          ":trophy:  Check the *leaderboard* with `/tacotime leaderboard`\n" +
          `:bar_chart:  View your *stats* with \`/tacotime my-tacos\`\n` +
          ":gift:  Redeem your tacos for *rewards* in the Taco Shop!",
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Let\u2019s get this taco party started! ${TACO_EMOJI}${TACO_EMOJI}${TACO_EMOJI} | *${APP_NAME}*`,
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// buildErrorBlocks
// Simple error message.
// ---------------------------------------------------------------------------

export function buildErrorBlocks(errorMessage: string): SlackBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:warning: *Oops!* ${errorMessage}`,
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCelebrationText(count: number): string {
  if (count >= 5) return ":star-struck: That\u2019s the max! What an honor!";
  if (count >= 3) return ":tada: Incredible generosity!";
  if (count >= 2) return ":fire: Double (or more) the love!";
  return ":tada:";
}

function buildProgressBar(used: number, total: number): string {
  const filled = Math.min(used, total);
  const empty = Math.max(0, total - filled);
  return (
    TACO_EMOJI.repeat(filled) +
    ":white_circle:".repeat(empty) +
    ` (${filled}/${total})`
  );
}
