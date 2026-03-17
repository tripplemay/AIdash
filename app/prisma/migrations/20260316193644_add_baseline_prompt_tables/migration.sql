-- AlterTable
ALTER TABLE `CourseRndProject` ADD COLUMN `deliverableName` VARCHAR(191) NULL,
    ADD COLUMN `deliverableType` VARCHAR(191) NULL,
    ADD COLUMN `imageStyle` VARCHAR(191) NULL,
    ADD COLUMN `imageStylePrompt` TEXT NULL,
    ADD COLUMN `orgForm` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `BaselineDoc` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `currentVersionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BaselineDoc_type_key_key`(`type`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BaselineDocVersion` (
    `id` VARCHAR(191) NOT NULL,
    `baselineDocId` VARCHAR(191) NOT NULL,
    `versionNo` INTEGER NOT NULL,
    `content` LONGTEXT NOT NULL,
    `editedById` VARCHAR(191) NULL,
    `editSummary` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BaselineDocVersion_baselineDocId_versionNo_key`(`baselineDocId`, `versionNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromptTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `actionKey` VARCHAR(191) NOT NULL,
    `actionLabel` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `currentVersionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PromptTemplate_actionKey_key`(`actionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromptTemplateVersion` (
    `id` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `versionNo` INTEGER NOT NULL,
    `content` LONGTEXT NOT NULL,
    `editedById` VARCHAR(191) NULL,
    `editSummary` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PromptTemplateVersion_templateId_versionNo_key`(`templateId`, `versionNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Preset` (
    `id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Preset_category_name_key`(`category`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BaselineDocVersion` ADD CONSTRAINT `BaselineDocVersion_baselineDocId_fkey` FOREIGN KEY (`baselineDocId`) REFERENCES `BaselineDoc`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromptTemplateVersion` ADD CONSTRAINT `PromptTemplateVersion_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `PromptTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
