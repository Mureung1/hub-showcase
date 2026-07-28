-- AlterTable
ALTER TABLE "Letter" ADD COLUMN     "recipientId" TEXT,
ADD COLUMN     "replyToId" TEXT,
ADD COLUMN     "threadId" TEXT;

-- CreateIndex
CREATE INDEX "Letter_threadId_idx" ON "Letter"("threadId");

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Letter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
