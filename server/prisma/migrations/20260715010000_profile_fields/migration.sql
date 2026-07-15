-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarColor" TEXT,
ADD COLUMN     "avatarEyes" INTEGER,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "handle" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");
