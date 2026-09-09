ALTER TABLE `exam_attempts` ADD `recordingKey` varchar(512);--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD `recordingMimeType` varchar(120);--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD `recordingConsentAt` timestamp;--> statement-breakpoint
ALTER TABLE `exam_attempts` ADD `recordingUploadedAt` timestamp;