-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('MORNING', 'LUNCH', 'DINNER', 'BEDTIME');

-- CreateTable
CREATE TABLE "Supplements" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "remainingQuantity" INTEGER NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoseSchedule" (
    "id" SERIAL NOT NULL,
    "supplementId" INTEGER NOT NULL,
    "timeSlot" "TimeSlot" NOT NULL,
    "doseAmount" INTEGER NOT NULL,

    CONSTRAINT "DoseSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoseLog" (
    "id" SERIAL NOT NULL,
    "doseScheduleId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "taken" BOOLEAN NOT NULL DEFAULT false,
    "takenAt" TIMESTAMP(3),

    CONSTRAINT "DoseLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Supplements" ADD CONSTRAINT "Supplements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoseSchedule" ADD CONSTRAINT "DoseSchedule_supplementId_fkey" FOREIGN KEY ("supplementId") REFERENCES "Supplements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoseLog" ADD CONSTRAINT "DoseLog_doseScheduleId_fkey" FOREIGN KEY ("doseScheduleId") REFERENCES "DoseSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
