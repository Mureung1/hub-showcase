-- CreateTable
CREATE TABLE `match_requests` (
    `request_id` BIGINT NOT NULL AUTO_INCREMENT,
    `from_team_id` BIGINT NOT NULL,
    `to_team_id` BIGINT NOT NULL,
    `similarity_score` DOUBLE NOT NULL,
    `status` ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `match_requests_from_team_id_to_team_id_key`(`from_team_id`, `to_team_id`),
    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
