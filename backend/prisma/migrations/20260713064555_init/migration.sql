-- CreateTable
CREATE TABLE `users` (
    `user_id` BIGINT NOT NULL AUTO_INCREMENT,
    `school_email` VARCHAR(100) NOT NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `password_hash` VARCHAR(255) NOT NULL,
    `nickname` VARCHAR(50) NOT NULL,
    `gender` VARCHAR(10) NOT NULL,
    `birth_year` INTEGER NOT NULL,
    `school_name` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_school_email_key`(`school_email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hobby_test_results` (
    `result_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `hobby_tags` JSON NOT NULL,
    `raw_answers` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `hobby_test_results_user_id_key`(`user_id`),
    PRIMARY KEY (`result_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `personality_tests` (
    `test_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `test_type` ENUM('dating', 'lifestyle') NOT NULL,
    `answers` JSON NOT NULL,
    `score_summary` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`test_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roommate_profiles` (
    `profile_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `roommate_type` ENUM('friend', 'business') NOT NULL,
    `region` VARCHAR(100) NOT NULL,
    `budget` INTEGER NOT NULL,
    `housing_type` ENUM('dorm', 'lease') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `roommate_profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dating_teams` (
    `team_id` BIGINT NOT NULL AUTO_INCREMENT,
    `leader_id` BIGINT NOT NULL,
    `gender` VARCHAR(10) NOT NULL,
    `team_size` INTEGER NOT NULL,
    `status` ENUM('recruiting', 'matched', 'closed') NOT NULL DEFAULT 'recruiting',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`team_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dating_team_members` (
    `team_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,

    PRIMARY KEY (`team_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matches` (
    `match_id` BIGINT NOT NULL AUTO_INCREMENT,
    `match_type` ENUM('roommate', 'dating_same', 'dating_opposite') NOT NULL,
    `party_a_id` BIGINT NOT NULL,
    `party_b_id` BIGINT NOT NULL,
    `similarity_score` DOUBLE NOT NULL,
    `status` ENUM('proposed', 'confirmed', 'rejected') NOT NULL DEFAULT 'proposed',
    `matched_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`match_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_rooms` (
    `chat_room_id` BIGINT NOT NULL AUTO_INCREMENT,
    `match_id` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `chat_rooms_match_id_key`(`match_id`),
    PRIMARY KEY (`chat_room_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_messages` (
    `message_id` BIGINT NOT NULL AUTO_INCREMENT,
    `chat_room_id` BIGINT NOT NULL,
    `sender_id` BIGINT NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`message_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `report_id` BIGINT NOT NULL AUTO_INCREMENT,
    `reporter_id` BIGINT NOT NULL,
    `target_id` BIGINT NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `status` ENUM('pending', 'reviewed', 'resolved') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`report_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hobby_test_results` ADD CONSTRAINT `hobby_test_results_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `personality_tests` ADD CONSTRAINT `personality_tests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roommate_profiles` ADD CONSTRAINT `roommate_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dating_teams` ADD CONSTRAINT `dating_teams_leader_id_fkey` FOREIGN KEY (`leader_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dating_team_members` ADD CONSTRAINT `dating_team_members_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `dating_teams`(`team_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dating_team_members` ADD CONSTRAINT `dating_team_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_rooms` ADD CONSTRAINT `chat_rooms_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_chat_room_id_fkey` FOREIGN KEY (`chat_room_id`) REFERENCES `chat_rooms`(`chat_room_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_reporter_id_fkey` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_target_id_fkey` FOREIGN KEY (`target_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
