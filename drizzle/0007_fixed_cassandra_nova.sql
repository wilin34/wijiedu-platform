CREATE TABLE `lesson_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lessonId` int NOT NULL,
	`studentId` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lesson_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `lesson_progress_lesson_student_unique` UNIQUE(`lessonId`,`studentId`)
);
--> statement-breakpoint
CREATE TABLE `module_assessment_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`studentId` int NOT NULL,
	`answers` text NOT NULL,
	`score` int NOT NULL,
	`maxScore` int NOT NULL,
	`passed` int NOT NULL DEFAULT 0,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `module_assessment_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `module_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moduleId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`description` text NOT NULL,
	`questions` text NOT NULL,
	`passingScore` int NOT NULL DEFAULT 70,
	`status` enum('draft','published') NOT NULL DEFAULT 'published',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `module_assessments_id` PRIMARY KEY(`id`)
);
