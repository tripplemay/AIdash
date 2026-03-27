-- AlterTable
ALTER TABLE `SlideshowDraft` ADD COLUMN `errorMessage` TEXT NULL,
    ADD COLUMN `progress` TEXT NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'idle';
