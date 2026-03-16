-- AlterTable: AiActionConfig 增加价格字段
ALTER TABLE `AiActionConfig` ADD COLUMN `inputPricePerM` DOUBLE NULL;
ALTER TABLE `AiActionConfig` ADD COLUMN `outputPricePerM` DOUBLE NULL;
ALTER TABLE `AiActionConfig` ADD COLUMN `pricingSource` VARCHAR(191) NULL;
ALTER TABLE `AiActionConfig` ADD COLUMN `pricingUpdatedAt` DATETIME(3) NULL;

-- CreateTable: 系统配置
CREATE TABLE `SystemConfig` (
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
