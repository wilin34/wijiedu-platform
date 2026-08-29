CREATE TABLE `recovery_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','resolved','cancelled') NOT NULL DEFAULT 'pending',
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	`resolvedBy` int,
	CONSTRAINT `recovery_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `recovery_requests_pending_unique` UNIQUE(`institutionId`,`userId`,`status`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `mustChangePassword` int DEFAULT 0 NOT NULL;