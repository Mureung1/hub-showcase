/*
  Warnings:

  - You are about to drop the column `budget` on the `roommate_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `guest_policy` on the `roommate_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `housing_type` on the `roommate_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `late_night_frequency` on the `roommate_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `roommate_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `sleep_habit` on the `roommate_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `smoking_status` on the `roommate_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `temperature_preference` on the `roommate_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `roommate_profiles` DROP COLUMN `budget`,
    DROP COLUMN `guest_policy`,
    DROP COLUMN `housing_type`,
    DROP COLUMN `late_night_frequency`,
    DROP COLUMN `region`,
    DROP COLUMN `sleep_habit`,
    DROP COLUMN `smoking_status`,
    DROP COLUMN `temperature_preference`;
