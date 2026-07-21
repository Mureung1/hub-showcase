-- AlterEnum
ALTER TYPE "HomeVisitAction" ADD VALUE 'PAT';

-- DropForeignKey
ALTER TABLE "DodoDiaryEntry" DROP CONSTRAINT "DodoDiaryEntry_representativeVideoPostId_fkey";

-- AlterTable
ALTER TABLE "DodoDiaryEntry" DROP COLUMN "mood",
ADD COLUMN     "mood" INTEGER,
ALTER COLUMN "representativeVideoPostId" SET NOT NULL;

-- AlterTable
ALTER TABLE "DodoState" DROP COLUMN "mood",
ADD COLUMN     "mood" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "HomeVisit" ADD COLUMN     "read" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "DodoDiaryEntry" ADD CONSTRAINT "DodoDiaryEntry_representativeVideoPostId_fkey" FOREIGN KEY ("representativeVideoPostId") REFERENCES "VideoPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusSessionParticipant" ADD CONSTRAINT "FocusSessionParticipant_videoPostId_fkey" FOREIGN KEY ("videoPostId") REFERENCES "VideoPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
