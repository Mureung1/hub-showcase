-- AlterTable
ALTER TABLE "CollectionPoint" ADD COLUMN     "ctpvNm" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "sggNm" TEXT;

-- CreateIndex
CREATE INDEX "CollectionPoint_ctpvNm_sggNm_idx" ON "CollectionPoint"("ctpvNm", "sggNm");
