/*
  Warnings:

  - Added the required column `guest_policy` to the `roommate_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `late_night_frequency` to the `roommate_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sleep_habit` to the `roommate_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `smoking_status` to the `roommate_profiles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `temperature_preference` to the `roommate_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `roommate_profiles` ADD COLUMN `guest_policy` ENUM('not_allowed', 'short_visit_with_notice', 'allowed_except_late', 'freely_allowed') NOT NULL,
    ADD COLUMN `late_night_frequency` ENUM('low', 'medium', 'high') NOT NULL,
    ADD COLUMN `sleep_habit` ENUM('none', 'mild', 'moderate', 'severe') NOT NULL,
    ADD COLUMN `smoking_status` ENUM('non_smoker', 'smoker_no_indoor', 'smoker') NOT NULL,
    ADD COLUMN `temperature_preference` ENUM('warm', 'cool', 'moderate', 'flexible') NOT NULL;
