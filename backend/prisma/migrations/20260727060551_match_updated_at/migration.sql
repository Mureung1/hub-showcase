/*
  Warnings:

  - Added the required column `updatedAt` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Letter_keywordsNorm_gin_idx";

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
