-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('VIDEO_POST', 'COMMENT', 'USER');

-- CreateEnum
CREATE TYPE "HomeVisitAction" AS ENUM ('SNACK', 'MESSAGE', 'PHOTO', 'FURNITURE_USE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SCHEDULE_REMINDER', 'TASK_DUE', 'FRIEND_REACTION', 'FRIEND_COMMENT', 'GROUP_INVITE', 'DODO_DIARY_READY');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PLUS');

-- CreateEnum
CREATE TYPE "PurchaseKind" AS ENUM ('ITEM', 'SUBSCRIPTION');

-- DropForeignKey
ALTER TABLE "DodoDiaryEntry" DROP CONSTRAINT "DodoDiaryEntry_videoPostId_fkey";

-- DropIndex
DROP INDEX "DodoDiaryEntry_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "DodoDiaryEntry" DROP COLUMN "videoPostId",
ADD COLUMN     "date" DATE NOT NULL,
ADD COLUMN     "mood" TEXT,
ADD COLUMN     "pointsEarned" INTEGER,
ADD COLUMN     "representativeVideoPostId" TEXT;

-- AlterTable
ALTER TABLE "PointsLedgerEntry" ADD COLUMN     "refId" TEXT,
ADD COLUMN     "refType" TEXT;

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "isAllDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "memo" TEXT,
ADD COLUMN     "recurrenceRule" TEXT,
ADD COLUMN     "reminderMinutesBefore" INTEGER,
ADD COLUMN     "requiresVideoProof" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTask" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScheduleTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "videoPostId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DodoState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DodoState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DodoAppearance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bodyColor" TEXT NOT NULL,
    "bodyPattern" TEXT,
    "eyeShape" TEXT NOT NULL,
    "eyeColor" TEXT NOT NULL,
    "eyelidStyle" TEXT,
    "hatItemId" TEXT,
    "glassesItemId" TEXT,
    "outfitItemId" TEXT,
    "accessoryItemId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DodoAppearance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeVisit" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "action" "HomeVisitAction" NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "shareGroupId" TEXT,
    "title" TEXT NOT NULL,
    "resolvedScheduleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryScene" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemorySceneParticipant" (
    "id" TEXT NOT NULL,
    "memorySceneId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MemorySceneParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusSessionParticipant" (
    "id" TEXT NOT NULL,
    "focusSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "videoPostId" TEXT,

    CONSTRAINT "FocusSessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedHome" (
    "id" TEXT NOT NULL,
    "shareGroupId" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "gauge" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedHome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedHomeLayout" (
    "id" TEXT NOT NULL,
    "sharedHomeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedHomeLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonEventParticipation" (
    "id" TEXT NOT NULL,
    "seasonEventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SeasonEventParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "refId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "PurchaseKind" NOT NULL,
    "refId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "provider" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "Report_targetType_targetId_idx" ON "Report"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ScheduleTask_scheduleId_idx" ON "ScheduleTask"("scheduleId");

-- CreateIndex
CREATE INDEX "Comment_videoPostId_createdAt_idx" ON "Comment"("videoPostId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DodoState_userId_key" ON "DodoState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DodoAppearance_userId_key" ON "DodoAppearance"("userId");

-- CreateIndex
CREATE INDEX "HomeVisit_hostId_createdAt_idx" ON "HomeVisit"("hostId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_resolvedScheduleId_key" ON "WishlistItem"("resolvedScheduleId");

-- CreateIndex
CREATE INDEX "WishlistItem_ownerId_idx" ON "WishlistItem"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryScene_scheduleId_key" ON "MemoryScene"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "MemorySceneParticipant_memorySceneId_userId_key" ON "MemorySceneParticipant"("memorySceneId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FocusSessionParticipant_focusSessionId_userId_key" ON "FocusSessionParticipant"("focusSessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedHome_shareGroupId_key" ON "SharedHome"("shareGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedHomeLayout_sharedHomeId_itemId_key" ON "SharedHomeLayout"("sharedHomeId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonEventParticipation_seasonEventId_userId_key" ON "SeasonEventParticipation"("seasonEventId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSetting_userId_type_key" ON "NotificationSetting"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DodoDiaryEntry_userId_date_key" ON "DodoDiaryEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTask" ADD CONSTRAINT "ScheduleTask_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_videoPostId_fkey" FOREIGN KEY ("videoPostId") REFERENCES "VideoPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DodoDiaryEntry" ADD CONSTRAINT "DodoDiaryEntry_representativeVideoPostId_fkey" FOREIGN KEY ("representativeVideoPostId") REFERENCES "VideoPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DodoState" ADD CONSTRAINT "DodoState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DodoAppearance" ADD CONSTRAINT "DodoAppearance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DodoAppearance" ADD CONSTRAINT "DodoAppearance_hatItemId_fkey" FOREIGN KEY ("hatItemId") REFERENCES "RoomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DodoAppearance" ADD CONSTRAINT "DodoAppearance_glassesItemId_fkey" FOREIGN KEY ("glassesItemId") REFERENCES "RoomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DodoAppearance" ADD CONSTRAINT "DodoAppearance_outfitItemId_fkey" FOREIGN KEY ("outfitItemId") REFERENCES "RoomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DodoAppearance" ADD CONSTRAINT "DodoAppearance_accessoryItemId_fkey" FOREIGN KEY ("accessoryItemId") REFERENCES "RoomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeVisit" ADD CONSTRAINT "HomeVisit_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeVisit" ADD CONSTRAINT "HomeVisit_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_shareGroupId_fkey" FOREIGN KEY ("shareGroupId") REFERENCES "ShareGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_resolvedScheduleId_fkey" FOREIGN KEY ("resolvedScheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryScene" ADD CONSTRAINT "MemoryScene_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemorySceneParticipant" ADD CONSTRAINT "MemorySceneParticipant_memorySceneId_fkey" FOREIGN KEY ("memorySceneId") REFERENCES "MemoryScene"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemorySceneParticipant" ADD CONSTRAINT "MemorySceneParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusSessionParticipant" ADD CONSTRAINT "FocusSessionParticipant_focusSessionId_fkey" FOREIGN KEY ("focusSessionId") REFERENCES "FocusSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusSessionParticipant" ADD CONSTRAINT "FocusSessionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedHome" ADD CONSTRAINT "SharedHome_shareGroupId_fkey" FOREIGN KEY ("shareGroupId") REFERENCES "ShareGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedHomeLayout" ADD CONSTRAINT "SharedHomeLayout_sharedHomeId_fkey" FOREIGN KEY ("sharedHomeId") REFERENCES "SharedHome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedHomeLayout" ADD CONSTRAINT "SharedHomeLayout_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "RoomItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonEventParticipation" ADD CONSTRAINT "SeasonEventParticipation_seasonEventId_fkey" FOREIGN KEY ("seasonEventId") REFERENCES "SeasonEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonEventParticipation" ADD CONSTRAINT "SeasonEventParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSetting" ADD CONSTRAINT "NotificationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

