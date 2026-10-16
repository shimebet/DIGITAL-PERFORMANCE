-- AlterTable
ALTER TABLE `follow_ups` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedByUserId` CHAR(36) NULL,
    ADD COLUMN `disabledAt` DATETIME(3) NULL,
    ADD COLUMN `disabledByUserId` CHAR(36) NULL,
    ADD COLUMN `isEnabled` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX `follow_ups_isEnabled_idx` ON `follow_ups`(`isEnabled`);

-- CreateIndex
CREATE INDEX `follow_ups_deletedAt_idx` ON `follow_ups`(`deletedAt`);
