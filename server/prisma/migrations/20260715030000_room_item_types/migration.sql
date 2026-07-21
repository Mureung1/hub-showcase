-- CreateEnum
CREATE TYPE "RoomItemType" AS ENUM ('FURNITURE', 'WALLPAPER', 'FLOOR', 'LIGHTING', 'WINDOW_VIEW', 'SEASONAL_DECOR');

-- AlterTable
ALTER TABLE "RoomItem" ADD COLUMN     "iconKey" TEXT NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "RoomItemType" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "equippedFloorId" TEXT,
ADD COLUMN     "equippedLightingId" TEXT,
ADD COLUMN     "equippedWallpaperId" TEXT,
ADD COLUMN     "equippedWindowViewId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_equippedWallpaperId_fkey" FOREIGN KEY ("equippedWallpaperId") REFERENCES "RoomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_equippedFloorId_fkey" FOREIGN KEY ("equippedFloorId") REFERENCES "RoomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_equippedLightingId_fkey" FOREIGN KEY ("equippedLightingId") REFERENCES "RoomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_equippedWindowViewId_fkey" FOREIGN KEY ("equippedWindowViewId") REFERENCES "RoomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
