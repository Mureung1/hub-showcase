-- AlterTable
ALTER TABLE `dating_teams` MODIFY `status` ENUM('recruiting', 'matched', 'closed', 'confirmed') NOT NULL DEFAULT 'recruiting';
