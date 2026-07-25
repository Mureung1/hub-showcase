-- AlterTable
ALTER TABLE "DisposalRule" ADD COLUMN     "commonMistakes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "explainedAt" TIMESTAMP(3),
ADD COLUMN     "parts" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "steps" TEXT[] DEFAULT ARRAY[]::TEXT[];
