-- AlterTable
ALTER TABLE `candidate_chat_rooms` ADD COLUMN `user1_last_read_at` DATETIME(3) NULL,
    ADD COLUMN `user2_last_read_at` DATETIME(3) NULL;
