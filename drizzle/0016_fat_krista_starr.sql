CREATE TABLE `academic_periods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`status` enum('planned','active','closed') NOT NULL DEFAULT 'planned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `academic_periods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admission_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`prospectId` int,
	`applicantUserId` int,
	`programName` varchar(180) NOT NULL,
	`status` enum('draft','submitted','under_review','approved','rejected','enrolled') NOT NULL DEFAULT 'draft',
	`submittedAt` timestamp,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admission_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admission_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`applicationId` int NOT NULL,
	`documentType` varchar(100) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` varchar(1024) NOT NULL,
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`rejectionReason` text,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admission_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alumni_interactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`alumniProfileId` int NOT NULL,
	`createdBy` int NOT NULL,
	`interactionType` enum('call','email','event','survey','note') NOT NULL,
	`summary` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alumni_interactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alumni_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`studentId` int NOT NULL,
	`graduationYear` int,
	`currentCompany` varchar(180),
	`jobTitle` varchar(180),
	`employmentStatus` enum('employed','self_employed','seeking','studying','unknown') NOT NULL DEFAULT 'unknown',
	`consentToContact` int NOT NULL DEFAULT 0,
	`lastContactAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alumni_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`studentId` int NOT NULL,
	`certificateType` varchar(120) NOT NULL,
	`certificateNumber` varchar(100) NOT NULL,
	`verificationToken` varchar(128) NOT NULL,
	`issuedBy` int NOT NULL,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificates_institution_number_unique` UNIQUE(`institutionId`,`certificateNumber`),
	CONSTRAINT `certificates_verification_token_unique` UNIQUE(`verificationToken`)
);
--> statement-breakpoint
CREATE TABLE `class_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`subjectId` int NOT NULL,
	`periodId` int NOT NULL,
	`teacherId` int,
	`weekday` int NOT NULL,
	`startsAt` varchar(5) NOT NULL,
	`endsAt` varchar(5) NOT NULL,
	`classroom` varchar(120),
	`modality` enum('onsite','virtual','hybrid') NOT NULL DEFAULT 'onsite',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `class_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`studentId` int NOT NULL,
	`status` enum('current','overdue','blocked') NOT NULL DEFAULT 'current',
	`balanceCents` int NOT NULL DEFAULT 0,
	`dueAt` timestamp,
	`blockedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_charges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`studentId` int NOT NULL,
	`concept` varchar(180) NOT NULL,
	`amountCents` int NOT NULL,
	`dueAt` timestamp NOT NULL,
	`status` enum('pending','partially_paid','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_charges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`concept` varchar(180) NOT NULL,
	`amountCents` int NOT NULL,
	`category` varchar(100) NOT NULL,
	`incurredAt` timestamp NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`studentId` int NOT NULL,
	`chargeId` int,
	`amountCents` int NOT NULL,
	`paymentMethod` varchar(80) NOT NULL,
	`reference` varchar(120),
	`receivedBy` int NOT NULL,
	`paidAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lms_content_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`contentId` int NOT NULL,
	`studentId` int NOT NULL,
	`completedAt` timestamp,
	`lastViewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lms_content_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `lms_content_student_unique` UNIQUE(`contentId`,`studentId`)
);
--> statement-breakpoint
CREATE TABLE `lms_contents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`subjectId` int NOT NULL,
	`moduleId` int,
	`title` varchar(220) NOT NULL,
	`contentType` enum('reading','video','link','file','task') NOT NULL,
	`body` text,
	`url` varchar(1024),
	`fileKey` varchar(512),
	`sortOrder` int NOT NULL DEFAULT 0,
	`published` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lms_contents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pre_enrollment_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`applicationId` int NOT NULL,
	`period` varchar(60) NOT NULL,
	`status` enum('submitted','under_review','approved','rejected','completed') NOT NULL DEFAULT 'submitted',
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`processedBy` int,
	`processedAt` timestamp,
	`notes` text,
	CONSTRAINT `pre_enrollment_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prospect_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`prospectId` int NOT NULL,
	`createdBy` int NOT NULL,
	`activityType` enum('call','email','meeting','note','status_change') NOT NULL,
	`summary` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prospect_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`fullName` varchar(180) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`documentId` varchar(64),
	`interestedProgram` varchar(180),
	`source` varchar(100),
	`status` enum('new','contacted','interested','admitted','enrolled','lost') NOT NULL DEFAULT 'new',
	`ownerUserId` int,
	`notes` text,
	`convertedStudentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospects_id` PRIMARY KEY(`id`),
	CONSTRAINT `prospects_institution_email_unique` UNIQUE(`institutionId`,`email`)
);
--> statement-breakpoint
CREATE TABLE `study_plan_subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`studyPlanId` int NOT NULL,
	`subjectId` int NOT NULL,
	`semester` int NOT NULL,
	`credits` int NOT NULL DEFAULT 0,
	`required` int NOT NULL DEFAULT 1,
	CONSTRAINT `study_plan_subjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`version` varchar(40) NOT NULL,
	`description` text,
	`active` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `study_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wellbeing_survey_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`responseId` int NOT NULL,
	`questionId` int NOT NULL,
	`answer` text NOT NULL,
	CONSTRAINT `wellbeing_survey_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wellbeing_survey_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`surveyId` int NOT NULL,
	`prompt` varchar(500) NOT NULL,
	`questionType` enum('scale','single_choice','text') NOT NULL,
	`options` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `wellbeing_survey_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wellbeing_survey_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`surveyId` int NOT NULL,
	`respondentUserId` int,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wellbeing_survey_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wellbeing_surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`institutionId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`audience` enum('students','teachers','alumni') NOT NULL,
	`triggerType` enum('period_end','annual_alumni','manual') NOT NULL,
	`anonymous` int NOT NULL DEFAULT 0,
	`active` int NOT NULL DEFAULT 1,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wellbeing_surveys_id` PRIMARY KEY(`id`)
);
