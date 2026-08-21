CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`createdBy` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`description` text,
	`dueAt` timestamp,
	`maxScore` int NOT NULL DEFAULT 100,
	`status` enum('draft','published','closed') NOT NULL DEFAULT 'draft',
	`resourceFileKey` varchar(512),
	`resourceFileUrl` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`subjectId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `enrollments_student_subject_unique` UNIQUE(`studentId`,`subjectId`)
);
--> statement-breakpoint
CREATE TABLE `grades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`subjectId` int NOT NULL,
	`period` varchar(60) NOT NULL,
	`title` varchar(220) NOT NULL,
	`score` int NOT NULL,
	`maxScore` int NOT NULL DEFAULT 100,
	`notes` text,
	`gradedBy` int NOT NULL,
	`gradedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`fullName` varchar(180) NOT NULL,
	`email` varchar(320) NOT NULL,
	`documentId` varchar(64),
	`birthDate` date,
	`phone` varchar(32),
	`guardianName` varchar(180),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`),
	CONSTRAINT `students_email_unique` UNIQUE(`email`),
	CONSTRAINT `students_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(180) NOT NULL,
	`description` text,
	`period` varchar(60) NOT NULL,
	`teacherId` int,
	`color` varchar(20) NOT NULL DEFAULT '#4F8EF7',
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subjects_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activityId` int NOT NULL,
	`studentId` int NOT NULL,
	`content` text,
	`fileKey` varchar(512),
	`fileUrl` varchar(1024),
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('pending','graded','returned') NOT NULL DEFAULT 'pending',
	`score` int,
	`feedback` text,
	`gradedBy` int,
	`gradedAt` timestamp,
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `submissions_activity_student_unique` UNIQUE(`activityId`,`studentId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','teacher','student','user') NOT NULL DEFAULT 'student';