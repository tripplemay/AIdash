-- AlterTable: User 增加 rd_manager 角色支持（role 字段本身是 String，无需 DDL）

-- CreateTable: 课程研发项目
CREATE TABLE `CourseRndProject` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'direction',
    `targetAudience` VARCHAR(191) NULL,
    `courseDirection` VARCHAR(191) NULL,
    `ageRange` VARCHAR(191) NULL,
    `level` VARCHAR(191) NULL,
    `lessonCount` INTEGER NULL,
    `coreDeliverable` VARCHAR(191) NULL,
    `roughFramework` LONGTEXT NULL,
    `coreNeeds` LONGTEXT NULL,
    `constraints` LONGTEXT NULL,
    `currentDirectionVersionId` VARCHAR(191) NULL,
    `currentPlanVersionId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: 课程方向版本
CREATE TABLE `CourseRndDirectionVersion` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `versionNo` INTEGER NOT NULL,
    `summary` LONGTEXT NULL,
    `frameworkJson` LONGTEXT NULL,
    `isSelected` BOOLEAN NOT NULL DEFAULT false,
    `promptSnapshot` LONGTEXT NULL,
    `modelName` VARCHAR(191) NULL,
    `inputTokens` INTEGER NULL,
    `outputTokens` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: 课程方案版本
CREATE TABLE `CourseRndPlanVersion` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `versionNo` INTEGER NOT NULL,
    `isSelected` BOOLEAN NOT NULL DEFAULT false,
    `planJson` LONGTEXT NOT NULL,
    `changeSummary` LONGTEXT NULL,
    `sourceDirectionVersionId` VARCHAR(191) NULL,
    `modelName` VARCHAR(191) NULL,
    `inputTokens` INTEGER NULL,
    `outputTokens` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: 课次草稿
CREATE TABLE `CourseRndLessonDraft` (
    `id` VARCHAR(191) NOT NULL,
    `planVersionId` VARCHAR(191) NOT NULL,
    `lessonNo` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `contentData` LONGTEXT NULL,
    `draftJson` LONGTEXT NULL,
    `lastFeedback` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CourseRndLessonDraft_planVersionId_lessonNo_key`(`planVersionId`, `lessonNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: AI 调用日志
CREATE TABLE `CourseRndAiCallLog` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `pageKey` VARCHAR(191) NOT NULL,
    `actionType` VARCHAR(191) NOT NULL,
    `modelName` VARCHAR(191) NOT NULL,
    `inputTokens` INTEGER NOT NULL DEFAULT 0,
    `outputTokens` INTEGER NOT NULL DEFAULT 0,
    `estimatedCost` DOUBLE NOT NULL DEFAULT 0,
    `cacheHit` BOOLEAN NOT NULL DEFAULT false,
    `userId` VARCHAR(191) NULL,
    `metadataJson` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: 课程发布记录
CREATE TABLE `CourseRndPublishRecord` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `packageSlug` VARCHAR(191) NOT NULL,
    `packageTitle` VARCHAR(191) NOT NULL,
    `publishedById` VARCHAR(191) NOT NULL,
    `resultJson` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: 操作日志
CREATE TABLE `OperationLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NULL,
    `targetName` VARCHAR(191) NULL,
    `detail` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: AI 服务提供商
CREATE TABLE `AiProvider` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `baseUrl` VARCHAR(191) NOT NULL,
    `apiKeyEnc` VARCHAR(191) NOT NULL,
    `protocol` VARCHAR(191) NOT NULL DEFAULT 'openai',
    `supportText` BOOLEAN NOT NULL DEFAULT true,
    `supportImage` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: AI 动作配置
CREATE TABLE `AiActionConfig` (
    `id` VARCHAR(191) NOT NULL,
    `actionKey` VARCHAR(191) NOT NULL,
    `actionLabel` VARCHAR(191) NOT NULL,
    `actionType` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `modelName` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `AiActionConfig_actionKey_key`(`actionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CourseRndProject` ADD CONSTRAINT `CourseRndProject_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseRndDirectionVersion` ADD CONSTRAINT `CourseRndDirectionVersion_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `CourseRndProject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseRndPlanVersion` ADD CONSTRAINT `CourseRndPlanVersion_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `CourseRndProject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseRndLessonDraft` ADD CONSTRAINT `CourseRndLessonDraft_planVersionId_fkey` FOREIGN KEY (`planVersionId`) REFERENCES `CourseRndPlanVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseRndPublishRecord` ADD CONSTRAINT `CourseRndPublishRecord_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `CourseRndProject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CourseRndPublishRecord` ADD CONSTRAINT `CourseRndPublishRecord_publishedById_fkey` FOREIGN KEY (`publishedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OperationLog` ADD CONSTRAINT `OperationLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiActionConfig` ADD CONSTRAINT `AiActionConfig_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `AiProvider`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
