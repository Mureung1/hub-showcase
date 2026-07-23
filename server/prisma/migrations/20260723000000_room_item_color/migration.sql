-- AlterTable
ALTER TABLE "RoomItem" ADD COLUMN     "colorCustomizable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserInventory" ADD COLUMN     "color" TEXT;
