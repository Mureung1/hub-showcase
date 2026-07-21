-- CreateIndex
CREATE UNIQUE INDEX "PointsLedgerEntry_userId_refType_refId_key" ON "PointsLedgerEntry"("userId", "refType", "refId");
