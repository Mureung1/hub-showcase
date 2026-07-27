-- AlterTable
ALTER TABLE "settlement_members" ADD COLUMN     "name" TEXT,
ADD COLUMN     "reportedAt" TIMESTAMP(3);

-- Backfill existing rows' name snapshot from the current username
UPDATE "settlement_members" sm
SET "name" = u."username"
FROM "users" u
WHERE u."id" = sm."userId";

-- AlterTable
ALTER TABLE "settlement_members" ALTER COLUMN "name" SET NOT NULL;
