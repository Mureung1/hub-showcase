ALTER TABLE "UserMission" ADD COLUMN IF NOT EXISTS "missionTitle" TEXT;
ALTER TABLE "UserMission" ADD COLUMN IF NOT EXISTS "submittedDescription" TEXT;
ALTER TABLE "UserMission" ADD COLUMN IF NOT EXISTS "submittedFileName" TEXT;
ALTER TABLE "UserMission" ADD COLUMN IF NOT EXISTS "submittedFileType" TEXT;
ALTER TABLE "UserMission" ADD COLUMN IF NOT EXISTS "submittedFileData" TEXT;
ALTER TABLE "UserMission" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
