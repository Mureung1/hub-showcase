-- AlterTable
ALTER TABLE "users" ADD COLUMN "preferredCategory" TEXT,
ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- DropIndex
DROP INDEX "challenges_date_key";

-- AlterTable
ALTER TABLE "challenges" ADD COLUMN "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "challenges_userId_date_key" ON "challenges"("userId", "date");

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
