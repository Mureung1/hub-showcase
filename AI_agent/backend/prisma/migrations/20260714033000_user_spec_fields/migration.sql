ALTER TABLE "UserSpec" RENAME COLUMN "jobGoal" TO "targetRole";

ALTER TABLE "UserSpec" ADD COLUMN "grade" TEXT NOT NULL DEFAULT '';
ALTER TABLE "UserSpec" ADD COLUMN "gpa" TEXT NOT NULL DEFAULT '';
ALTER TABLE "UserSpec" ADD COLUMN "languageScore" TEXT NOT NULL DEFAULT '';
ALTER TABLE "UserSpec" ADD COLUMN "projects" TEXT NOT NULL DEFAULT '';

ALTER TABLE "UserSpec" ALTER COLUMN "targetRole" SET DEFAULT '';
UPDATE "UserSpec" SET "targetRole" = '' WHERE "targetRole" IS NULL;
ALTER TABLE "UserSpec" ALTER COLUMN "targetRole" SET NOT NULL;

ALTER TABLE "UserSpec" ALTER COLUMN "certificates" DROP DEFAULT;
ALTER TABLE "UserSpec" ALTER COLUMN "certificates" TYPE TEXT USING array_to_string("certificates", ', ');
ALTER TABLE "UserSpec" ALTER COLUMN "certificates" SET DEFAULT '';

ALTER TABLE "UserSpec" ALTER COLUMN "activities" DROP DEFAULT;
ALTER TABLE "UserSpec" ALTER COLUMN "activities" TYPE TEXT USING array_to_string("activities", ', ');
ALTER TABLE "UserSpec" ALTER COLUMN "activities" SET DEFAULT '';

ALTER TABLE "UserSpec" ALTER COLUMN "skills" DROP DEFAULT;
ALTER TABLE "UserSpec" ALTER COLUMN "skills" TYPE TEXT USING array_to_string("skills", ', ');
ALTER TABLE "UserSpec" ALTER COLUMN "skills" SET DEFAULT '';
