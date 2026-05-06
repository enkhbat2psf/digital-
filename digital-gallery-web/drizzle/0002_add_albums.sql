-- Add albums (batches) and link images to albums.
-- This migration is written to be safe for existing installations with galleryImages rows.

CREATE TABLE `albums` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `albums_id` PRIMARY KEY(`id`)
);

-- Ensure there is at least one album to attach existing images.
INSERT INTO `albums` (`name`, `createdBy`)
SELECT 'Default', 1
WHERE NOT EXISTS (SELECT 1 FROM `albums` LIMIT 1);

ALTER TABLE `galleryImages` ADD COLUMN `albumId` int;

UPDATE `galleryImages`
SET `albumId` = (SELECT `id` FROM `albums` ORDER BY `id` ASC LIMIT 1)
WHERE `albumId` IS NULL;

ALTER TABLE `galleryImages` MODIFY COLUMN `albumId` int NOT NULL;

ALTER TABLE `galleryImages`
ADD CONSTRAINT `galleryImages_albumId_albums_id_fk`
FOREIGN KEY (`albumId`) REFERENCES `albums`(`id`)
ON DELETE CASCADE;

