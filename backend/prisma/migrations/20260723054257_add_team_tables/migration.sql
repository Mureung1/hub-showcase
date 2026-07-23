-- CreateTable
CREATE TABLE `team_invites` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `from_user_id` BIGINT NOT NULL,
    `to_user_id` BIGINT NOT NULL,
    `team_id` BIGINT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `team_invites` ADD CONSTRAINT `team_invites_from_user_id_fkey` FOREIGN KEY (`from_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_invites` ADD CONSTRAINT `team_invites_to_user_id_fkey` FOREIGN KEY (`to_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_invites` ADD CONSTRAINT `team_invites_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `dating_teams`(`team_id`) ON DELETE SET NULL ON UPDATE CASCADE;
