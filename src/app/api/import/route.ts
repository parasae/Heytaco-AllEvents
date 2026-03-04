import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import * as XLSX from "xlsx";

function parseTimestamp(ts: string | number): Date {
  if (!ts) return new Date();
  if (typeof ts === "number") {
    // Excel serial date
    return new Date((ts - 25569) * 86400 * 1000);
  }
  // Try direct parse first
  const parsed = new Date(ts);
  if (!isNaN(parsed.getTime())) return parsed;
  // Try MM-DD-YYYY format
  const match = String(ts).match(/(\d{2})-(\d{2})-(\d{4})\s+(.+)/);
  if (match) {
    const [, month, day, year, time] = match;
    return new Date(`${year}-${month}-${day} ${time}`);
  }
  return new Date();
}

interface TacoRow {
  "Receiver UID": string;
  "Receiver Username": string;
  "Receiver Email": string;
  "Giver UID": string;
  "Giver Username": string;
  "Giver Email": string;
  Timestamp: string | number;
  "Channel Name": string;
  Message: string;
  Tacos: number;
  Tags: string | null;
  Type: string;
}

interface RedemptionRow {
  "User ID": string;
  "Redemption Amount": number;
  Username: string;
  "Display name": string;
  Email: string;
  Timezone: string;
  Timestamp: string | number;
  Title: string;
  Fulfilled: boolean | string;
  Type: string;
  Metadata: string;
}

export async function POST(request: NextRequest) {
  const adminOrRes = await requireAdmin();
  if (adminOrRes instanceof NextResponse) return adminOrRes;

  try {
    const formData = await request.formData();
    const teamId = formData.get("teamId") as string;
    const tacoFile = formData.get("tacoFile") as File | null;
    const redemptionFile = formData.get("redemptionFile") as File | null;

    if (!teamId) {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }

    if (!tacoFile && !redemptionFile) {
      return NextResponse.json(
        { error: "At least one file is required" },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    let tacoRows: TacoRow[] = [];
    let redemptionRows: RedemptionRow[] = [];

    // Parse taco file
    if (tacoFile) {
      try {
        const buffer = Buffer.from(await tacoFile.arrayBuffer());
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        tacoRows = XLSX.utils.sheet_to_json<TacoRow>(sheet);
      } catch (e) {
        errors.push(`Failed to parse taco file: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Parse redemption file
    if (redemptionFile) {
      try {
        const buffer = Buffer.from(await redemptionFile.arrayBuffer());
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        redemptionRows = XLSX.utils.sheet_to_json<RedemptionRow>(sheet);
      } catch (e) {
        errors.push(`Failed to parse redemption file: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Collect all unique users by slackId
    const userMap = new Map<
      string,
      { slackId: string; name: string; displayName: string; email?: string }
    >();

    for (const row of tacoRows) {
      if (row["Giver UID"]) {
        userMap.set(row["Giver UID"], {
          slackId: row["Giver UID"],
          name: row["Giver Username"] || row["Giver UID"],
          displayName: row["Giver Username"] || row["Giver UID"],
          email: row["Giver Email"] || undefined,
        });
      }
      if (row["Receiver UID"]) {
        userMap.set(row["Receiver UID"], {
          slackId: row["Receiver UID"],
          name: row["Receiver Username"] || row["Receiver UID"],
          displayName: row["Receiver Username"] || row["Receiver UID"],
          email: row["Receiver Email"] || undefined,
        });
      }
    }

    for (const row of redemptionRows) {
      if (row["User ID"]) {
        const existing = userMap.get(row["User ID"]);
        userMap.set(row["User ID"], {
          slackId: row["User ID"],
          name: row.Username || existing?.name || row["User ID"],
          displayName: row["Display name"] || existing?.displayName || row.Username || row["User ID"],
          email: row.Email || existing?.email || undefined,
        });
      }
    }

    // Upsert all users
    let usersCreated = 0;
    const slackIdToDbId = new Map<string, string>();

    for (const userData of userMap.values()) {
      try {
        const user = await prisma.user.upsert({
          where: { slackId: userData.slackId },
          update: {
            name: userData.name,
            displayName: userData.displayName,
            ...(userData.email ? { email: userData.email } : {}),
          },
          create: {
            slackId: userData.slackId,
            teamId,
            name: userData.name,
            displayName: userData.displayName,
            email: userData.email,
          },
        });
        slackIdToDbId.set(userData.slackId, user.id);
        usersCreated++;
      } catch (e) {
        errors.push(`Failed to upsert user ${userData.slackId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Collect and upsert tags
    let tagsCreated = 0;
    const tagNameToId = new Map<string, string>();

    const allTagNames = new Set<string>();
    for (const row of tacoRows) {
      if (row.Tags && typeof row.Tags === "string") {
        const names = row.Tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
        names.forEach((n) => allTagNames.add(n));
      }
    }

    for (const tagName of allTagNames) {
      try {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          update: {},
          create: {
            name: tagName,
            teamId,
          },
        });
        tagNameToId.set(tagName, tag.id);
        tagsCreated++;
      } catch (e) {
        errors.push(`Failed to upsert tag "${tagName}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Import taco transactions
    let tacosImported = 0;

    for (const row of tacoRows) {
      const giverId = slackIdToDbId.get(row["Giver UID"]);
      const receiverId = slackIdToDbId.get(row["Receiver UID"]);

      if (!giverId || !receiverId) {
        errors.push(`Skipping taco: missing user mapping for giver=${row["Giver UID"]} or receiver=${row["Receiver UID"]}`);
        continue;
      }

      const amount = Number(row.Tacos) || 1;

      try {
        const taco = await prisma.taco.create({
          data: {
            giverId,
            receiverId,
            amount,
            message: row.Message || null,
            channelName: row["Channel Name"] || null,
            teamId,
            createdAt: parseTimestamp(row.Timestamp),
          },
        });

        // Create TacoTag entries
        if (row.Tags && typeof row.Tags === "string") {
          const names = row.Tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
          for (const tagName of names) {
            const tagId = tagNameToId.get(tagName);
            if (tagId) {
              try {
                await prisma.tacoTag.create({
                  data: { tacoId: taco.id, tagId },
                });
              } catch {
                // Duplicate tag entry, skip
              }
            }
          }
        }

        // Update user counters
        await prisma.user.update({
          where: { id: giverId },
          data: { totalGiven: { increment: amount } },
        });
        await prisma.user.update({
          where: { id: receiverId },
          data: {
            totalReceived: { increment: amount },
            redeemable: { increment: amount },
          },
        });

        tacosImported++;
      } catch (e) {
        errors.push(`Failed to import taco row: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Import redemptions
    let redemptionsImported = 0;
    let rewardsCreated = 0;
    const rewardTitleToId = new Map<string, string>();

    // Create unique rewards from titles
    const uniqueRewardTitles = new Set<string>();
    for (const row of redemptionRows) {
      if (row.Title) {
        uniqueRewardTitles.add(row.Title);
      }
    }

    for (const title of uniqueRewardTitles) {
      try {
        let reward = await prisma.reward.findFirst({
          where: { title, teamId },
        });
        if (!reward) {
          reward = await prisma.reward.create({
            data: {
              title,
              cost: 0,
              type: "custom",
              teamId,
            },
          });
          rewardsCreated++;
        }
        rewardTitleToId.set(title, reward.id);
      } catch (e) {
        errors.push(`Failed to create reward "${title}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Create redemption records
    for (const row of redemptionRows) {
      const userId = slackIdToDbId.get(row["User ID"]);
      const rewardId = rewardTitleToId.get(row.Title);

      if (!userId || !rewardId) {
        errors.push(`Skipping redemption: missing user=${row["User ID"]} or reward="${row.Title}"`);
        continue;
      }

      const isFulfilled =
        row.Fulfilled === true ||
        row.Fulfilled === "true" ||
        row.Fulfilled === "TRUE" ||
        row.Fulfilled === "Yes" ||
        row.Fulfilled === "yes";

      try {
        await prisma.redemption.create({
          data: {
            userId,
            rewardId,
            status: isFulfilled ? "fulfilled" : "pending",
            teamId,
            createdAt: parseTimestamp(row.Timestamp),
          },
        });

        // Deduct from user's redeemable if fulfilled
        if (isFulfilled) {
          const amount = Number(row["Redemption Amount"]) || 0;
          if (amount > 0) {
            await prisma.user.update({
              where: { id: userId },
              data: { redeemable: { decrement: amount } },
            });
          }
        }

        redemptionsImported++;
      } catch (e) {
        errors.push(`Failed to import redemption: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        usersCreated,
        tacosImported,
        tagsCreated,
        redemptionsImported,
        rewardsCreated,
        errors,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Import failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
