-- CreateTable
CREATE TABLE "RegionRule" (
    "id" TEXT NOT NULL,
    "ctpvNm" TEXT NOT NULL,
    "sggNm" TEXT NOT NULL,
    "dongNm" TEXT NOT NULL,
    "categories" JSONB NOT NULL,
    "unclltDay" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegionRule_ctpvNm_sggNm_dongNm_key" ON "RegionRule"("ctpvNm", "sggNm", "dongNm");
