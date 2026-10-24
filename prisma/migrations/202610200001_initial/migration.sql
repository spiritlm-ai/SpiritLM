-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `clerkId` VARCHAR(191) NOT NULL,
    `balance` DECIMAL(20, 8) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_clerkId_key`(`clerkId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApiKey` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(48) NOT NULL,
    `hash` CHAR(64) NOT NULL,
    `prefix` VARCHAR(24) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ApiKey_hash_key`(`hash`),
    INDEX `ApiKey_userId_revokedAt_idx`(`userId`, `revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApiRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `apiKeyId` VARCHAR(191) NULL,
    `model` VARCHAR(191) NOT NULL,
    `upstreamModel` VARCHAR(191) NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `streaming` BOOLEAN NOT NULL,
    `diagnostic` BOOLEAN NOT NULL DEFAULT false,
    `httpStatus` INTEGER NULL,
    `inputTokens` INTEGER NULL,
    `outputTokens` INTEGER NULL,
    `cachedTokens` INTEGER NULL,
    `reasoningTokens` INTEGER NULL,
    `totalTokens` INTEGER NULL,
    `usageKnown` BOOLEAN NOT NULL DEFAULT false,
    `estimatedCost` DECIMAL(20, 8) NULL,
    `chargedCost` DECIMAL(20, 8) NOT NULL DEFAULT 0,
    `pricePerMillion` DECIMAL(20, 8) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,
    `durationMs` INTEGER NULL,

    INDEX `ApiRequest_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `ApiRequest_apiKeyId_createdAt_idx`(`apiKeyId`, `createdAt`),
    INDEX `ApiRequest_userId_status_createdAt_idx`(`userId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BalanceEntry` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `operationId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(20, 8) NOT NULL,
    `note` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BalanceEntry_operationId_key`(`operationId`),
    INDEX `BalanceEntry_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ApiKey` ADD CONSTRAINT `ApiKey_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApiRequest` ADD CONSTRAINT `ApiRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApiRequest` ADD CONSTRAINT `ApiRequest_apiKeyId_fkey` FOREIGN KEY (`apiKeyId`) REFERENCES `ApiKey`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BalanceEntry` ADD CONSTRAINT `BalanceEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
