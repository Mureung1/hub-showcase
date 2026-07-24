-- CreateEnum
CREATE TYPE "SettlementMemberStatus" AS ENUM ('pending', 'done');

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "billingMonth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_members" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "SettlementMemberStatus" NOT NULL DEFAULT 'pending',
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settlements_subscriptionId_billingMonth_key" ON "settlements"("subscriptionId", "billingMonth");

-- CreateIndex
CREATE UNIQUE INDEX "settlement_members_settlementId_userId_key" ON "settlement_members"("settlementId", "userId");

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_members" ADD CONSTRAINT "settlement_members_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_members" ADD CONSTRAINT "settlement_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
