-- AlterTable
ALTER TABLE "DisposalRule" ADD COLUMN     "commonMistakesEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "explainedAtEn" TIMESTAMP(3),
ADD COLUMN     "partsEn" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "reasonEn" TEXT,
ADD COLUMN     "stepsEn" TEXT[] DEFAULT ARRAY[]::TEXT[];
