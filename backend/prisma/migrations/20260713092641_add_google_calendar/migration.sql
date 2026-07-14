-- AlterTable
ALTER TABLE "scraps" ADD COLUMN     "googleEventId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "googleAccessToken" TEXT,
ADD COLUMN     "googleConnectedAt" TIMESTAMP(3),
ADD COLUMN     "googleRefreshToken" TEXT;
