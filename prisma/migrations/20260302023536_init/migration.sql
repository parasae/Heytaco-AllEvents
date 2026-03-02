-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slackId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "avatarUrl" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dailyLimit" INTEGER NOT NULL DEFAULT 5,
    "totalReceived" INTEGER NOT NULL DEFAULT 0,
    "totalGiven" INTEGER NOT NULL DEFAULT 0,
    "redeemable" INTEGER NOT NULL DEFAULT 0,
    "birthday" TEXT,
    "workAnniversary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Taco" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "giverId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "channel" TEXT,
    "channelName" TEXT,
    "teamId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Taco_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Taco_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#F59E0B',
    "teamId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TacoTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tacoId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "TacoTag_tacoId_fkey" FOREIGN KEY ("tacoId") REFERENCES "Taco" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TacoTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cost" INTEGER NOT NULL,
    "quantity" INTEGER,
    "imageUrl" TEXT,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "teamId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "teamId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Redemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT,
    "dailyTacoLimit" INTEGER NOT NULL DEFAULT 5,
    "leaderboardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reactionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "giverModeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tacoEmoji" TEXT NOT NULL DEFAULT ':taco:',
    "welcomeMessage" TEXT,
    "slackBotToken" TEXT,
    "slackSigningSecret" TEXT,
    "slackClientId" TEXT,
    "slackClientSecret" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DailyTacoTracker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "tacosGiven" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "User_slackId_key" ON "User"("slackId");

-- CreateIndex
CREATE INDEX "User_teamId_idx" ON "User"("teamId");

-- CreateIndex
CREATE INDEX "Taco_giverId_idx" ON "Taco"("giverId");

-- CreateIndex
CREATE INDEX "Taco_receiverId_idx" ON "Taco"("receiverId");

-- CreateIndex
CREATE INDEX "Taco_teamId_idx" ON "Taco"("teamId");

-- CreateIndex
CREATE INDEX "Taco_createdAt_idx" ON "Taco"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_teamId_idx" ON "Tag"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TacoTag_tacoId_tagId_key" ON "TacoTag"("tacoId", "tagId");

-- CreateIndex
CREATE INDEX "Reward_teamId_idx" ON "Reward"("teamId");

-- CreateIndex
CREATE INDEX "Redemption_userId_idx" ON "Redemption"("userId");

-- CreateIndex
CREATE INDEX "Redemption_teamId_idx" ON "Redemption"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSettings_teamId_key" ON "TeamSettings"("teamId");

-- CreateIndex
CREATE INDEX "DailyTacoTracker_userId_idx" ON "DailyTacoTracker"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTacoTracker_userId_date_key" ON "DailyTacoTracker"("userId", "date");
