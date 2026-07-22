-- AlterTable
ALTER TABLE "RoomItem" ADD COLUMN     "equippable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "interactable" BOOLEAN NOT NULL DEFAULT false;
