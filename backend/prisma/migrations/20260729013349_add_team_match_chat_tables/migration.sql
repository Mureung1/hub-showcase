-- CreateTable
CREATE TABLE `team_match_chat_rooms` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `match_request_id` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `team_match_chat_rooms_match_request_id_key`(`match_request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_match_chat_room_members` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `chat_room_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `last_read_at` DATETIME(3) NULL,

    UNIQUE INDEX `team_match_chat_room_members_chat_room_id_user_id_key`(`chat_room_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_match_chat_messages` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `chat_room_id` BIGINT NOT NULL,
    `sender_id` BIGINT NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `team_match_chat_room_members` ADD CONSTRAINT `team_match_chat_room_members_chat_room_id_fkey` FOREIGN KEY (`chat_room_id`) REFERENCES `team_match_chat_rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_match_chat_messages` ADD CONSTRAINT `team_match_chat_messages_chat_room_id_fkey` FOREIGN KEY (`chat_room_id`) REFERENCES `team_match_chat_rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
