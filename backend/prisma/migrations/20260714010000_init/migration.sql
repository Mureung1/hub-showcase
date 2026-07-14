-- CreateTable
CREATE TABLE `notice_sites` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guild_id` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `listSelector` VARCHAR(255) NOT NULL,
    `titleSelector` VARCHAR(255) NOT NULL,
    `linkSelector` VARCHAR(255) NOT NULL,
    `dateSelector` VARCHAR(255) NOT NULL,
    `categorySelector` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notice_sites_guild_id_key`(`guild_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `noticeSiteId` INTEGER NOT NULL,
    `channelId` VARCHAR(255) NOT NULL,
    `roleId` VARCHAR(255) NULL,
    `roleName` VARCHAR(255) NOT NULL,
    `isActive` BOOLEAN NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_noticeSiteId_name_key`(`noticeSiteId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `noticeSiteId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `hashKey` VARCHAR(64) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `link` VARCHAR(2048) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `normalizedLink` VARCHAR(2048) NOT NULL,
    `summary` TEXT NULL,
    `firstSeenAt` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notices_hashKey_key`(`hashKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(255) NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `subscriptions_userId_categoryId_key`(`userId`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `keywords` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guildId` VARCHAR(255) NOT NULL,
    `userId` VARCHAR(255) NOT NULL,
    `keyword` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `keywords_guildId_userId_keyword_key`(`guildId`, `userId`, `keyword`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_noticeSiteId_fkey` FOREIGN KEY (`noticeSiteId`) REFERENCES `notice_sites`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notices` ADD CONSTRAINT `notices_noticeSiteId_fkey` FOREIGN KEY (`noticeSiteId`) REFERENCES `notice_sites`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notices` ADD CONSTRAINT `notices_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
