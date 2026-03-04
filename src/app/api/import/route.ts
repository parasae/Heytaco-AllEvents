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
  const str = String(ts);
  // Try MM-DD-YYYY h:mm:ss AM/PM format first (HeyTaco export format)
  const match = str.match(/(\d{2})-(\d{2})-(\d{4})\s+(.+)/);
  if (match) {
    const [, month, day, year, time] = match;
    const parsed = new Date(`${year}-${month}-${day} ${time}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  // Fallback to direct parse
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
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
  "Redemption Amount": number | string;
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

    if (tacoRows.length === 0 && redemptionRows.length === 0) {
      return NextResponse.json(
        { error: errors.length > 0 ? errors.join("; ") : "No data found in uploaded files" },
        { status: 400 }
      );
    }

    // =====================================================
    // STEP 1: Collect all unique users from both files
    // =====================================================
    const userMap = new Map<
      string,
      { slackId: string; name: string; displayName: string; email?: string }
    >();

    for (const row of tacoRows) {
      if (row["Giver UID"] && !userMap.has(row["Giver UID"])) {
        userMap.set(row["Giver UID"], {
          slackId: row["Giver UID"],
          name: row["Giver Username"] || row["Giver UID"],
          displayName: row["Giver Username"] || row["Giver UID"],
          email: row["Giver Email"] || undefined,
        });
      }
      if (row["Receiver UID"] && !userMap.has(row["Receiver UID"])) {
        userMap.set(row["Receiver UID"], {
          slackId: row["Receiver UID"],
          name: row["Receiver Username"] || row["Receiver UID"],
          displayName: row["Receiver Username"] || row["Receiver UID"],
          email: row["Receiver Email"] || undefined,
        });
      }
    }

    for (const row of redemptionRows) {
      if (row["User ID"] && !userMap.has(row["User ID"])) {
        userMap.set(row["User ID"], {
          slackId: row["User ID"],
          name: row.Username || row["User ID"],
          displayName: row["Display name"] || row.Username || row["User ID"],
          email: row.Email || undefined,
        });
      }
    }

    // =====================================================
    // STEP 2: Upsert users (unavoidable - ~173 calls)
    // Only update fields that are missing (don't overwrite
    // names from users who already signed in via Slack)
    // =====================================================
    let usersCreated = 0;
    const slackIdToDbId = new Map<string, string>();

    for (const userData of userMap.values()) {
      try {
        const user = await prisma.user.upsert({
          where: { slackId: userData.slackId },
          update: {
            // Only set email if not already set
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

    // =====================================================
    // STEP 3: Collect and upsert tags
    // =====================================================
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
          create: { name: tagName, teamId },
        });
        tagNameToId.set(tagName, tag.id);
        tagsCreated++;
      } catch (e) {
        errors.push(`Failed to upsert tag "${tagName}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // =====================================================
    // STEP 4: Bulk create tacos with createMany
    // Compute user stats in memory instead of incrementing
    // =====================================================
    const userStats = new Map<string, { given: number; received: number }>();

    // Prepare all taco data in memory
    const tacoData: {
      giverId: string;
      receiverId: string;
      amount: number;
      message: string | null;
      channelName: string | null;
      teamId: string;
      createdAt: Date;
    }[] = [];

    for (const row of tacoRows) {
      const giverId = slackIdToDbId.get(row["Giver UID"]);
      const receiverId = slackIdToDbId.get(row["Receiver UID"]);

      if (!giverId || !receiverId) {
        errors.push(`Skipping taco: missing user for giver=${row["Giver UID"]} or receiver=${row["Receiver UID"]}`);
        continue;
      }

      const amount = Number(row.Tacos) || 1;

      tacoData.push({
        giverId,
        receiverId,
        amount,
        message: row.Message || null,
        channelName: row["Channel Name"] || null,
        teamId,
        createdAt: parseTimestamp(row.Timestamp),
      });

      // Accumulate stats in memory
      const giverStats = userStats.get(giverId) || { given: 0, received: 0 };
      giverStats.given += amount;
      userStats.set(giverId, giverStats);

      const receiverStats = userStats.get(receiverId) || { given: 0, received: 0 };
      receiverStats.received += amount;
      userStats.set(receiverId, receiverStats);
    }

    // Bulk insert tacos in batches of 500
    let tacosImported = 0;
    const BATCH_SIZE = 500;
    for (let i = 0; i < tacoData.length; i += BATCH_SIZE) {
      const batch = tacoData.slice(i, i + BATCH_SIZE);
      try {
        const result = await prisma.taco.createMany({ data: batch });
        tacosImported += result.count;
      } catch (e) {
        errors.push(`Failed to insert taco batch ${i}-${i + batch.length}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Note: TacoTag linking is skipped in batch mode since createMany
    // doesn't return IDs. Tags column is empty in the provided data anyway.

    // =====================================================
    // STEP 5: Create rewards from redemption titles
    // Use actual Redemption Amount as the cost
    // =====================================================
    let rewardsCreated = 0;
    const rewardTitleToId = new Map<string, string>();

    // Collect unique rewards with their cost from the first occurrence
    const rewardInfo = new Map<string, number>();
    for (const row of redemptionRows) {
      if (row.Title && !rewardInfo.has(row.Title)) {
        rewardInfo.set(row.Title, Number(row["Redemption Amount"]) || 0);
      }
    }

    for (const [title, cost] of rewardInfo) {
      try {
        let reward = await prisma.reward.findFirst({
          where: { title, teamId },
        });
        if (!reward) {
          reward = await prisma.reward.create({
            data: {
              title,
              cost,
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

    // =====================================================
    // STEP 6: Bulk create redemptions
    // Track fulfilled amounts in memory
    // =====================================================
    const fulfilledPerUser = new Map<string, number>();

    const redemptionData: {
      userId: string;
      rewardId: string;
      status: string;
      teamId: string;
      createdAt: Date;
    }[] = [];

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
        row.Fulfilled === "TRUE";

      redemptionData.push({
        userId,
        rewardId,
        status: isFulfilled ? "fulfilled" : "pending",
        teamId,
        createdAt: parseTimestamp(row.Timestamp),
      });

      // Track fulfilled amounts for redeemable calculation
      if (isFulfilled) {
        const amount = Number(row["Redemption Amount"]) || 0;
        fulfilledPerUser.set(userId, (fulfilledPerUser.get(userId) || 0) + amount);
      }
    }

    let redemptionsImported = 0;
    if (redemptionData.length > 0) {
      try {
        const result = await prisma.redemption.createMany({ data: redemptionData });
        redemptionsImported = result.count;
      } catch (e) {
        errors.push(`Failed to insert redemptions: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // =====================================================
    // STEP 7: Update all user stats in one pass
    // Set absolute values (not increment) to avoid
    // duplication issues on re-import
    // =====================================================
    let statsUpdated = 0;
    for (const [dbId, stats] of userStats) {
      const fulfilled = fulfilledPerUser.get(dbId) || 0;
      const redeemable = Math.max(0, stats.received - fulfilled);

      try {
        await prisma.user.update({
          where: { id: dbId },
          data: {
            totalGiven: stats.given,
            totalReceived: stats.received,
            redeemable,
          },
        });
        statsUpdated++;
      } catch (e) {
        errors.push(`Failed to update stats for user ${dbId}: ${e instanceof Error ? e.message : String(e)}`);
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
        statsUpdated,
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
