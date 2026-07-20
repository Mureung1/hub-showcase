ALTER TABLE `notice_sites` ADD COLUMN `categoryListSelector` VARCHAR(255) NULL;

UPDATE `notice_sites`
SET `categoryListSelector` = `categorySelector`
WHERE `categoryListSelector` IS NULL;

ALTER TABLE `notice_sites` MODIFY `categoryListSelector` VARCHAR(255) NOT NULL;
