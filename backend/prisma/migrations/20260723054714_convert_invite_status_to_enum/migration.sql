/*
  Warnings:

  - You are about to alter the column `status` on the `team_invites` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `Enum(EnumId(6))`.

*/
-- AlterTable
ALTER TABLE `team_invites` MODIFY `status` ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending';
