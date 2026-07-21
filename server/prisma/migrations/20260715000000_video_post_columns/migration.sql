-- DropIndex
DROP INDEX "Reaction_videoPostId_fromUserId_kind_key";

-- AlterTable
ALTER TABLE "VideoPost" DROP COLUMN "duration",
ADD COLUMN     "contentType" TEXT NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "durationSeconds" INTEGER NOT NULL,
ADD COLUMN     "sizeBytes" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_videoPostId_fromUserId_key" ON "Reaction"("videoPostId", "fromUserId");

-- CreateIndex
CREATE INDEX "VideoPost_scheduleId_idx" ON "VideoPost"("scheduleId");
