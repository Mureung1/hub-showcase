-- CreateEnum
CREATE TYPE "CategoryAuditAction" AS ENUM ('CREATED', 'DELETED');

-- CreateTable
CREATE TABLE "CategoryAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tone" "Tone" NOT NULL,
    "action" "CategoryAuditAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryAuditLog_userId_createdAt_idx" ON "CategoryAuditLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CategoryAuditLog" ADD CONSTRAINT "CategoryAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
