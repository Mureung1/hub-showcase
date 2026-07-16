-- AlterTable
ALTER TABLE "analyses" ADD COLUMN     "contribution_history" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "recent_repos" JSONB NOT NULL DEFAULT '[]';
