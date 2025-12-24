-- DropIndex
DROP INDEX `Photo_posterId_idx` ON `Photo`;

-- AddForeignKey
ALTER TABLE `Photo` ADD CONSTRAINT `Photo_posterId_fkey` FOREIGN KEY (`posterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
