-- AlterTable
ALTER TABLE "RoutineDay" ADD COLUMN     "skippedToId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "RoutineDay_skippedToId_key" ON "RoutineDay"("skippedToId");

-- AddForeignKey
ALTER TABLE "RoutineDay" ADD CONSTRAINT "RoutineDay_skippedToId_fkey" FOREIGN KEY ("skippedToId") REFERENCES "RoutineDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;
