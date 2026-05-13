ALTER TABLE `courses` MODIFY COLUMN `is_mandatory` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `programs` ADD `cover_image_url` varchar(512);