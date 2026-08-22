CREATE TABLE `course_lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moduleId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`summary` text NOT NULL,
	`explanation` text NOT NULL,
	`keyTopics` text NOT NULL,
	`classActivity` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `course_lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `course_modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`overview` text NOT NULL,
	`learningObjectives` text NOT NULL,
	`estimatedHours` int NOT NULL DEFAULT 2,
	`imageUrl` varchar(1024),
	`imagePrompt` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `course_modules_id` PRIMARY KEY(`id`)
);
