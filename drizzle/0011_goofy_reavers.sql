CREATE TABLE `institution_memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL DEFAULT 1,
	`userId` int NOT NULL,
	`role` enum('admin','teacher','student') NOT NULL DEFAULT 'student',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `institution_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `institution_memberships_unique` UNIQUE(`institutionId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `institutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `institutions_id` PRIMARY KEY(`id`),
	CONSTRAINT `institutions_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `students` DROP INDEX `students_email_unique`;--> statement-breakpoint
ALTER TABLE `subjects` DROP INDEX `subjects_code_unique`;--> statement-breakpoint
ALTER TABLE `activities` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `competencies` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `course_lessons` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `course_modules` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `course_resources` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `enrollments` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `grades` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `lesson_progress` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `live_classes` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `module_assessment_attempts` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `module_assessments` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `subjects` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `institutionId` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_institution_email_unique` UNIQUE(`institutionId`,`email`);--> statement-breakpoint
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_institution_code_unique` UNIQUE(`institutionId`,`code`);