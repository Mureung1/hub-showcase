-- AlterTable
ALTER TABLE `users` ADD COLUMN `username` VARCHAR(50) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_username_key` ON `users`(`username`);
