-- CreateEnum
CREATE TYPE "RoomEquipSlot" AS ENUM ('HAT', 'GLASSES', 'OUTFIT', 'ACCESSORY');

-- AlterTable
ALTER TABLE "RoomItem" ADD COLUMN     "equipSlot" "RoomEquipSlot";
