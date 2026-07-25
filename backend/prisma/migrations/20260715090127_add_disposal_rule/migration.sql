-- CreateTable
CREATE TABLE "DisposalRule" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "govItemName" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "sourceRegion" TEXT NOT NULL DEFAULT '서울',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisposalRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DisposalRule_itemId_key" ON "DisposalRule"("itemId");

-- AddForeignKey
ALTER TABLE "DisposalRule" ADD CONSTRAINT "DisposalRule_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
