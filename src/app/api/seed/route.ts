import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DEMO_TEAM_ID, DEFAULT_TAGS } from "@/lib/constants";
import { requireAdmin } from "@/lib/auth";

interface SampleUser {
  name: string;
  displayName: string;
  email: string;
}

const SAMPLE_USERS: SampleUser[] = [
  { name: "alice.johnson", displayName: "Alice Johnson", email: "alice@example.com" },
  { name: "bob.smith", displayName: "Bob Smith", email: "bob@example.com" },
  { name: "carol.williams", displayName: "Carol Williams", email: "carol@example.com" },
  { name: "david.brown", displayName: "David Brown", email: "david@example.com" },
  { name: "emma.davis", displayName: "Emma Davis", email: "emma@example.com" },
  { name: "frank.miller", displayName: "Frank Miller", email: "frank@example.com" },
  { name: "grace.wilson", displayName: "Grace Wilson", email: "grace@example.com" },
  { name: "henry.taylor", displayName: "Henry Taylor", email: "henry@example.com" },
  { name: "iris.martinez", displayName: "Iris Martinez", email: "iris@example.com" },
  { name: "jack.anderson", displayName: "Jack Anderson", email: "jack@example.com" },
];

const SAMPLE_MESSAGES: string[] = [
  "Thanks for helping me debug that issue!",
  "Amazing presentation today!",
  "Great job on the code review, really thorough!",
  "Thanks for staying late to fix the deployment",
  "Your documentation was super helpful",
  "Loved your creative solution to the caching problem",
  "Thanks for mentoring the new team members",
  "Awesome teamwork on the sprint delivery!",
  "Your feedback on my PR was invaluable",
  "Thanks for organizing the team lunch!",
  "Really impressed with the new feature you shipped",
  "Thanks for covering my on-call shift",
  "Great job leading the standup today",
  "Your test coverage improvements saved us from a bug",
  "Thanks for the quick turnaround on that hotfix",
  "Really appreciate your patience explaining the architecture",
  "Awesome job on the client demo!",
  "Thanks for setting up the CI pipeline",
  "Your refactoring made the code so much cleaner",
  "Great initiative on the accessibility improvements",
];

interface SampleChannel {
  id: string;
  name: string;
}

const SAMPLE_CHANNELS: SampleChannel[] = [
  { id: "C001", name: "general" },
  { id: "C002", name: "engineering" },
  { id: "C003", name: "random" },
  { id: "C004", name: "shoutouts" },
  { id: "C005", name: "team-alpha" },
];

const SAMPLE_REWARDS = [
  {
    title: "Coffee Gift Card",
    description: "A $5 gift card for your favorite coffee shop",
    cost: 10,
    quantity: 20,
    imageUrl: "https://ui-avatars.com/api/?name=Coffee&background=6F4E37&color=fff&size=128",
    type: "giftcard",
  },
  {
    title: "Extra Day Off",
    description: "Take an extra day off, you deserve it!",
    cost: 50,
    quantity: 5,
    imageUrl: "https://ui-avatars.com/api/?name=Day+Off&background=10B981&color=fff&size=128",
    type: "custom",
  },
  {
    title: "Team Lunch",
    description: "Lunch for you and your team on the company",
    cost: 30,
    quantity: 10,
    imageUrl: "https://ui-avatars.com/api/?name=Lunch&background=F59E0B&color=fff&size=128",
    type: "group",
  },
  {
    title: "Swag Box",
    description: "A box of company swag - t-shirt, stickers, and more",
    cost: 25,
    quantity: 15,
    imageUrl: "https://ui-avatars.com/api/?name=Swag&background=8B5CF6&color=fff&size=128",
    type: "custom",
  },
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): Date {
  const now = new Date();
  const pastDate = new Date(now);
  pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * daysBack));
  pastDate.setHours(
    Math.floor(Math.random() * 10) + 8,
    Math.floor(Math.random() * 60),
    Math.floor(Math.random() * 60)
  );
  return pastDate;
}

export async function POST() {
  try {
    const adminOrResponse = await requireAdmin();
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    // Get existing user IDs for cleanup
    const existingUsers = await prisma.user.findMany({
      where: { teamId: DEMO_TEAM_ID },
      select: { id: true },
    });
    const existingUserIds = existingUsers.map((u: { id: string }) => u.id);

    // Clear existing demo data in correct order
    await prisma.tacoTag.deleteMany({
      where: { taco: { teamId: DEMO_TEAM_ID } },
    });
    await prisma.redemption.deleteMany({ where: { teamId: DEMO_TEAM_ID } });
    await prisma.taco.deleteMany({ where: { teamId: DEMO_TEAM_ID } });
    await prisma.reward.deleteMany({ where: { teamId: DEMO_TEAM_ID } });
    await prisma.tag.deleteMany({ where: { teamId: DEMO_TEAM_ID } });
    if (existingUserIds.length > 0) {
      await prisma.dailyTacoTracker.deleteMany({
        where: { userId: { in: existingUserIds } },
      });
    }
    await prisma.user.deleteMany({ where: { teamId: DEMO_TEAM_ID } });
    await prisma.teamSettings.deleteMany({ where: { teamId: DEMO_TEAM_ID } });

    // Create team settings
    await prisma.teamSettings.create({
      data: {
        teamId: DEMO_TEAM_ID,
        teamName: "TacoTime Demo Team",
        dailyTacoLimit: 5,
      },
    });

    // Create users
    const users: { id: string; name: string; displayName: string }[] = await Promise.all(
      SAMPLE_USERS.map((u: SampleUser) =>
        prisma.user.create({
          data: {
            slackId: `demo-${u.name}`,
            teamId: DEMO_TEAM_ID,
            name: u.name,
            displayName: u.displayName,
            email: u.email,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=random&color=fff&size=128`,
            isAdmin: u.name === "alice.johnson",
          },
        })
      )
    );

    // Create tags
    const tags: { id: string; name: string }[] = await Promise.all(
      DEFAULT_TAGS.map((t: { name: string; description: string; color: string }) =>
        prisma.tag.create({
          data: {
            name: t.name,
            description: t.description,
            color: t.color,
            teamId: DEMO_TEAM_ID,
          },
        })
      )
    );

    // Create 60 sample tacos spread over the last 30 days
    const tacoCount = 60;
    const tacos: { id: string; giverId: string; receiverId: string; amount: number; createdAt: Date }[] = [];

    for (let i = 0; i < tacoCount; i++) {
      const giver = randomElement(users);
      let receiver = randomElement(users);
      // Ensure giver !== receiver
      while (receiver.id === giver.id) {
        receiver = randomElement(users);
      }

      const amount = Math.random() < 0.3 ? Math.floor(Math.random() * 3) + 2 : 1;
      const channel = randomElement(SAMPLE_CHANNELS);
      const createdAt = randomDate(30);

      const taco = await prisma.taco.create({
        data: {
          giverId: giver.id,
          receiverId: receiver.id,
          amount,
          message: randomElement(SAMPLE_MESSAGES),
          channel: channel.id,
          channelName: channel.name,
          teamId: DEMO_TEAM_ID,
          createdAt,
        },
      });

      tacos.push(taco);

      // Add 1-2 random tags to ~60% of tacos
      if (Math.random() < 0.6) {
        const numTags = Math.random() < 0.5 ? 1 : 2;
        const shuffledTags = [...tags].sort(() => Math.random() - 0.5);
        const selectedTags = shuffledTags.slice(0, numTags);

        await prisma.tacoTag.createMany({
          data: selectedTags.map((tag: { id: string }) => ({
            tacoId: taco.id,
            tagId: tag.id,
          })),
        });
      }

      // Update user stats
      await prisma.user.update({
        where: { id: giver.id },
        data: { totalGiven: { increment: amount } },
      });
      await prisma.user.update({
        where: { id: receiver.id },
        data: {
          totalReceived: { increment: amount },
          redeemable: { increment: amount },
        },
      });
    }

    // Create rewards
    await Promise.all(
      SAMPLE_REWARDS.map((r) =>
        prisma.reward.create({
          data: {
            ...r,
            teamId: DEMO_TEAM_ID,
          },
        })
      )
    );

    // Create daily tracker entries for today
    const today = new Date().toISOString().split("T")[0];
    const todayTacos = tacos.filter(
      (t) => t.createdAt.toISOString().split("T")[0] === today
    );

    const giverTodayMap = new Map<string, number>();
    for (const t of todayTacos) {
      giverTodayMap.set(
        t.giverId,
        (giverTodayMap.get(t.giverId) || 0) + t.amount
      );
    }

    await Promise.all(
      Array.from(giverTodayMap.entries()).map(([userId, given]: [string, number]) =>
        prisma.dailyTacoTracker.upsert({
          where: { userId_date: { userId, date: today } },
          update: { tacosGiven: given },
          create: { userId, date: today, tacosGiven: given },
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: {
        users: users.length,
        tags: tags.length,
        tacos: tacos.length,
        rewards: SAMPLE_REWARDS.length,
      },
    });
  } catch (error) {
    console.error("Error seeding data:", error);
    return NextResponse.json(
      { error: "Failed to seed data" },
      { status: 500 }
    );
  }
}
