CREATE TABLE `exam_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`attemptId` int NOT NULL,
	`questionId` int NOT NULL,
	`answer` text NOT NULL,
	`autoScore` int,
	`manualScore` int,
	`feedback` text,
	`isReviewed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`examId` int NOT NULL,
	`studentId` int NOT NULL,
	`attemptNumber` int NOT NULL,
	`status` enum('in_progress','submitted','under_review','graded','cancelled') NOT NULL DEFAULT 'in_progress',
	`cameraGranted` int NOT NULL DEFAULT 0,
	`microphoneGranted` int NOT NULL DEFAULT 0,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`submittedAt` timestamp,
	`autoScore` int,
	`manualScore` int,
	`finalScore` int,
	`tutorFeedback` text,
	CONSTRAINT `exam_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_proctoring_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`attemptId` int NOT NULL,
	`eventType` enum('camera_granted','camera_revoked','microphone_granted','microphone_revoked','fullscreen_entered','fullscreen_exited','tab_hidden','tab_visible','technical_error') NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_proctoring_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exam_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`examId` int NOT NULL,
	`questionType` enum('open','single_choice','multiple_choice','true_false','fill_blank','matching','ordering') NOT NULL,
	`prompt` text NOT NULL,
	`options` text,
	`correctAnswer` text,
	`rubric` text,
	`points` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exam_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`subjectId` int NOT NULL,
	`moduleId` int,
	`title` varchar(220) NOT NULL,
	`description` text,
	`instructions` text,
	`durationMinutes` int NOT NULL DEFAULT 60,
	`maxAttempts` int NOT NULL DEFAULT 1,
	`requiresCamera` int NOT NULL DEFAULT 1,
	`requiresMicrophone` int NOT NULL DEFAULT 1,
	`status` enum('draft','published','closed') NOT NULL DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exams_id` PRIMARY KEY(`id`)
);
