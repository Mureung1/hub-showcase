-- CreateTable
CREATE TABLE "BulkyWasteFee" (
    "id" TEXT NOT NULL,
    "ctpvNm" TEXT NOT NULL,
    "sggNm" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "paidFree" TEXT NOT NULL,
    "fee" INTEGER NOT NULL,
    "sourceDate" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulkyWasteFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkyWasteReportSite" (
    "id" TEXT NOT NULL,
    "ctpvNm" TEXT NOT NULL,
    "sggNm" TEXT NOT NULL,
    "reportUrl" TEXT NOT NULL,

    CONSTRAINT "BulkyWasteReportSite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulkyWasteFee_ctpvNm_sggNm_itemName_idx" ON "BulkyWasteFee"("ctpvNm", "sggNm", "itemName");

-- CreateIndex
CREATE UNIQUE INDEX "BulkyWasteReportSite_ctpvNm_sggNm_key" ON "BulkyWasteReportSite"("ctpvNm", "sggNm");
