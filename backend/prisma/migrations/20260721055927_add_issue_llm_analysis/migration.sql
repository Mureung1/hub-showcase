-- AlterTable
ALTER TABLE "issue_cache" ADD COLUMN     "analyzed_at" TIMESTAMP(3),
ADD COLUMN     "guide" JSONB,
ADD COLUMN     "issue_summary" TEXT,
ADD COLUMN     "required_skills" JSONB;
