-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "hideFromRecommendation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAllDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "memo" TEXT,
ADD COLUMN     "startTime" TEXT;

-- CreateIndex
CREATE INDEX "calendar_events_hideFromRecommendation_idx" ON "calendar_events"("hideFromRecommendation");
