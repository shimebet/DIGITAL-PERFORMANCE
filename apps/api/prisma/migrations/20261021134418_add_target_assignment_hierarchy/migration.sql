-- AlterTable
ALTER TABLE `target_assignments` ADD COLUMN `parentAssignmentId` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `target_assignments_parentAssignmentId_idx` ON `target_assignments`(`parentAssignmentId`);

-- AddForeignKey
ALTER TABLE `target_assignments` ADD CONSTRAINT `target_assignments_parentAssignmentId_fkey` FOREIGN KEY (`parentAssignmentId`) REFERENCES `target_assignments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
