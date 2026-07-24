-- AlterTable
ALTER TABLE "RegionDistrict" ADD COLUMN     "ctpvNmEn" TEXT,
ADD COLUMN     "sggNmEn" TEXT;

-- CreateTable
CREATE TABLE "RegionZoneName" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegionZoneName_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegionZoneName_name_key" ON "RegionZoneName"("name");
