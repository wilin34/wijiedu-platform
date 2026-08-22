CREATE TABLE `live_classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`description` text,
	`meetUrl` varchar(1024) NOT NULL,
	`startsAt` timestamp NOT NULL,
	`durationMinutes` int NOT NULL DEFAULT 60,
	`status` enum('draft','published','completed','cancelled') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `live_classes_id` PRIMARY KEY(`id`)
);
