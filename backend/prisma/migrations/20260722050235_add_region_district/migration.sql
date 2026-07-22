-- CreateTable
CREATE TABLE "RegionDistrict" (
    "id" TEXT NOT NULL,
    "ctpvNm" TEXT NOT NULL,
    "sggNm" TEXT NOT NULL,

    CONSTRAINT "RegionDistrict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegionDistrict_ctpvNm_sggNm_key" ON "RegionDistrict"("ctpvNm", "sggNm");
