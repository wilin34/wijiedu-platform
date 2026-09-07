import {
  date,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const institutions = mysqlTable(
  "institutions",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    logoUrl: varchar("logoUrl", { length: 1024 }),
    primaryColor: varchar("primaryColor", { length: 20 }).default("#B69A5E").notNull(),
    secondaryColor: varchar("secondaryColor", { length: 20 }).default("#1B201D").notNull(),
    status: mysqlEnum("status", ["active", "suspended"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ slugUnique: uniqueIndex("institutions_slug_unique").on(table.slug) })
);

export const institutionMemberships = mysqlTable(
  "institution_memberships",
  {
    id: int("id").autoincrement().primaryKey(),
    institutionId: int("institutionId").default(1).notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["admin", "teacher", "student"]).default("student").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({ membershipUnique: uniqueIndex("institution_memberships_unique").on(table.institutionId, table.userId) })
);

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 32 }),
    bio: text("bio"),
    profilePhotoUrl: varchar("profilePhotoUrl", { length: 1024 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    passwordHash: varchar("passwordHash", { length: 255 }),
    sessionVersion: int("sessionVersion").default(0).notNull(),
    mustChangePassword: int("mustChangePassword").default(0).notNull(),
    role: mysqlEnum("role", ["admin", "teacher", "student", "user"]).default("student").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  table => ({ emailUnique: uniqueIndex("users_email_unique").on(table.email) })
);

export const students = mysqlTable(
  "students",
  {
    id: int("id").autoincrement().primaryKey(),
    institutionId: int("institutionId").default(1).notNull(),
    userId: int("userId"),
    fullName: varchar("fullName", { length: 180 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    documentId: varchar("documentId", { length: 64 }),
    birthDate: date("birthDate"),
    phone: varchar("phone", { length: 32 }),
    guardianName: varchar("guardianName", { length: 180 }),
    profilePhotoUrl: varchar("profilePhotoUrl", { length: 1024 }),
    status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    emailUnique: uniqueIndex("students_institution_email_unique").on(table.institutionId, table.email),
    userUnique: uniqueIndex("students_user_unique").on(table.userId),
  })
);

export const subjects = mysqlTable(
  "subjects",
  {
    id: int("id").autoincrement().primaryKey(),
    institutionId: int("institutionId").default(1).notNull(),
    code: varchar("code", { length: 32 }).notNull(),
    name: varchar("name", { length: 180 }).notNull(),
    description: text("description"),
    period: varchar("period", { length: 60 }).notNull(),
    teacherId: int("teacherId"),
    color: varchar("color", { length: 20 }).default("#4F8EF7").notNull(),
    active: int("active").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ codeUnique: uniqueIndex("subjects_institution_code_unique").on(table.institutionId, table.code) })
);

export const courseResources = mysqlTable("course_resources", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").default(1).notNull(),
  subjectId: int("subjectId").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  resourceType: mysqlEnum("resourceType", ["link", "document", "video", "reading"]).default("reading").notNull(),
  url: varchar("url", { length: 1024 }),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const competencies = mysqlTable("competencies", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").default(1).notNull(),
  subjectId: int("subjectId").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  level: mysqlEnum("level", ["basic", "intermediate", "advanced"]).default("intermediate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const courseModules = mysqlTable("course_modules", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").default(1).notNull(),
  subjectId: int("subjectId").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  overview: text("overview").notNull(),
  learningObjectives: text("learningObjectives").notNull(),
  estimatedHours: int("estimatedHours").default(2).notNull(),
  imageUrl: varchar("imageUrl", { length: 1024 }),
  imagePrompt: text("imagePrompt"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const courseLessons = mysqlTable("course_lessons", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").default(1).notNull(),
  moduleId: int("moduleId").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  summary: text("summary").notNull(),
  explanation: text("explanation").notNull(),
  keyTopics: text("keyTopics").notNull(),
  classActivity: text("classActivity"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const moduleAssessments = mysqlTable("module_assessments", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").default(1).notNull(),
  moduleId: int("moduleId").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description").notNull(),
  questions: text("questions").notNull(),
  passingScore: int("passingScore").default(70).notNull(),
  status: mysqlEnum("status", ["draft", "published"]).default("published").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const moduleAssessmentAttempts = mysqlTable("module_assessment_attempts", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").default(1).notNull(),
  assessmentId: int("assessmentId").notNull(),
  studentId: int("studentId").notNull(),
  answers: text("answers").notNull(),
  score: int("score").notNull(),
  maxScore: int("maxScore").notNull(),
  passed: int("passed").default(0).notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export const lessonProgress = mysqlTable(
  "lesson_progress",
  {
    id: int("id").autoincrement().primaryKey(),
    institutionId: int("institutionId").default(1).notNull(),
    lessonId: int("lessonId").notNull(),
    studentId: int("studentId").notNull(),
    completedAt: timestamp("completedAt").defaultNow().notNull(),
  },
  table => ({ lessonStudentUnique: uniqueIndex("lesson_progress_lesson_student_unique").on(table.lessonId, table.studentId) })
);

export const enrollments = mysqlTable(
  "enrollments",
  {
    id: int("id").autoincrement().primaryKey(),
    institutionId: int("institutionId").default(1).notNull(),
    studentId: int("studentId").notNull(),
    subjectId: int("subjectId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    enrollmentUnique: uniqueIndex("enrollments_student_subject_unique").on(
      table.studentId,
      table.subjectId
    ),
  })
);

export const activities = mysqlTable("activities", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").default(1).notNull(),
  subjectId: int("subjectId").notNull(),
  createdBy: int("createdBy").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  dueAt: timestamp("dueAt"),
  maxScore: int("maxScore").default(100).notNull(),
  status: mysqlEnum("status", ["draft", "published", "closed"]).default("draft").notNull(),
  resourceFileKey: varchar("resourceFileKey", { length: 512 }),
  resourceFileUrl: varchar("resourceFileUrl", { length: 1024 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const submissions = mysqlTable(
  "submissions",
  {
    id: int("id").autoincrement().primaryKey(),
    institutionId: int("institutionId").default(1).notNull(),
    activityId: int("activityId").notNull(),
    studentId: int("studentId").notNull(),
    content: text("content"),
    fileKey: varchar("fileKey", { length: 512 }),
    fileUrl: varchar("fileUrl", { length: 1024 }),
    submittedAt: timestamp("submittedAt").defaultNow().notNull(),
    status: mysqlEnum("status", ["pending", "graded", "returned"]).default("pending").notNull(),
    score: int("score"),
    feedback: text("feedback"),
    gradedBy: int("gradedBy"),
    gradedAt: timestamp("gradedAt"),
  },
  table => ({
    submissionUnique: uniqueIndex("submissions_activity_student_unique").on(
      table.activityId,
      table.studentId
    ),
  })
);

export const grades = mysqlTable("grades", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").default(1).notNull(),
  studentId: int("studentId").notNull(),
  subjectId: int("subjectId").notNull(),
  period: varchar("period", { length: 60 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  score: int("score").notNull(),
  maxScore: int("maxScore").default(100).notNull(),
  notes: text("notes"),
  gradedBy: int("gradedBy").notNull(),
  gradedAt: timestamp("gradedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").default(1).notNull(),
  subjectId: int("subjectId").notNull(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
});

export const liveClasses = mysqlTable("live_classes", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").default(1).notNull(),
  subjectId: int("subjectId").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  meetUrl: varchar("meetUrl", { length: 1024 }).notNull(),
  startsAt: timestamp("startsAt").notNull(),
  durationMinutes: int("durationMinutes").default(60).notNull(),
  status: mysqlEnum("status", ["draft", "published", "completed", "cancelled"]).default("draft").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Student = typeof students.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Grade = typeof grades.$inferSelect;
export type CourseResource = typeof courseResources.$inferSelect;
export type Competency = typeof competencies.$inferSelect;
export type CourseModule = typeof courseModules.$inferSelect;
export type CourseLesson = typeof courseLessons.$inferSelect;
export type ModuleAssessment = typeof moduleAssessments.$inferSelect;
export type ModuleAssessmentAttempt = typeof moduleAssessmentAttempts.$inferSelect;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type LiveClass = typeof liveClasses.$inferSelect;


export const recoveryRequests = mysqlTable(
  "recovery_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    institutionId: int("institutionId").notNull(),
    userId: int("userId").notNull(),
    status: mysqlEnum("status", ["pending", "resolved", "cancelled"]).default("pending").notNull(),
    requestedAt: timestamp("requestedAt").defaultNow().notNull(),
    resolvedAt: timestamp("resolvedAt"),
    resolvedBy: int("resolvedBy"),
  },
  table => ({ pendingUnique: uniqueIndex("recovery_requests_pending_unique").on(table.institutionId, table.userId, table.status) })
);

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").default(1).notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["academic", "assessment", "live_class", "message", "system"]).default("system").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  message: text("message").notNull(),
  href: varchar("href", { length: 512 }),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notificationPreferences = mysqlTable(
  "notification_preferences",
  {
    id: int("id").autoincrement().primaryKey(),
    institutionId: int("institutionId").default(1).notNull(),
    userId: int("userId").notNull(),
    academicEnabled: int("academicEnabled").default(1).notNull(),
    assessmentEnabled: int("assessmentEnabled").default(1).notNull(),
    liveClassEnabled: int("liveClassEnabled").default(1).notNull(),
    messageEnabled: int("messageEnabled").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({ userInstitutionUnique: uniqueIndex("notification_preferences_user_institution_unique").on(table.userId, table.institutionId) })
);

// Plataforma institucional integral: módulos operativos adicionales.
export const prospects = mysqlTable("prospects", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(),
  fullName: varchar("fullName", { length: 180 }).notNull(), email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }), documentId: varchar("documentId", { length: 64 }),
  interestedProgram: varchar("interestedProgram", { length: 180 }), source: varchar("source", { length: 100 }),
  status: mysqlEnum("status", ["new", "contacted", "interested", "admitted", "enrolled", "lost"]).default("new").notNull(),
  ownerUserId: int("ownerUserId"), notes: text("notes"), convertedStudentId: int("convertedStudentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ emailIndex: uniqueIndex("prospects_institution_email_unique").on(table.institutionId, table.email) }));

export const prospectActivities = mysqlTable("prospect_activities", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), prospectId: int("prospectId").notNull(),
  createdBy: int("createdBy").notNull(), activityType: mysqlEnum("activityType", ["call", "email", "meeting", "note", "status_change"]).notNull(),
  summary: varchar("summary", { length: 500 }).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const admissionApplications = mysqlTable("admission_applications", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), prospectId: int("prospectId"), applicantUserId: int("applicantUserId"),
  programName: varchar("programName", { length: 180 }).notNull(), status: mysqlEnum("status", ["draft", "submitted", "under_review", "approved", "rejected", "enrolled"]).default("draft").notNull(),
  submittedAt: timestamp("submittedAt"), reviewedBy: int("reviewedBy"), reviewedAt: timestamp("reviewedAt"), reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const admissionDocuments = mysqlTable("admission_documents", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), applicationId: int("applicationId").notNull(),
  documentType: varchar("documentType", { length: 100 }).notNull(), originalName: varchar("originalName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(), fileUrl: varchar("fileUrl", { length: 1024 }).notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(), reviewedBy: int("reviewedBy"), reviewedAt: timestamp("reviewedAt"), rejectionReason: text("rejectionReason"),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export const preEnrollmentRequests = mysqlTable("pre_enrollment_requests", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), applicationId: int("applicationId").notNull(), period: varchar("period", { length: 60 }).notNull(),
  status: mysqlEnum("status", ["submitted", "under_review", "approved", "rejected", "completed"]).default("submitted").notNull(), requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  processedBy: int("processedBy"), processedAt: timestamp("processedAt"), notes: text("notes"),
});

export const academicPeriods = mysqlTable("academic_periods", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), name: varchar("name", { length: 100 }).notNull(),
  startsAt: timestamp("startsAt").notNull(), endsAt: timestamp("endsAt").notNull(), status: mysqlEnum("status", ["planned", "active", "closed"]).default("planned").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const classSchedules = mysqlTable("class_schedules", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), subjectId: int("subjectId").notNull(), periodId: int("periodId").notNull(), teacherId: int("teacherId"),
  weekday: int("weekday").notNull(), startsAt: varchar("startsAt", { length: 5 }).notNull(), endsAt: varchar("endsAt", { length: 5 }).notNull(), classroom: varchar("classroom", { length: 120 }),
  modality: mysqlEnum("modality", ["onsite", "virtual", "hybrid"]).default("onsite").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const studyPlans = mysqlTable("study_plans", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), name: varchar("name", { length: 180 }).notNull(), version: varchar("version", { length: 40 }).notNull(),
  description: text("description"), active: int("active").default(1).notNull(), createdBy: int("createdBy").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const studyPlanSubjects = mysqlTable("study_plan_subjects", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), studyPlanId: int("studyPlanId").notNull(), subjectId: int("subjectId").notNull(), semester: int("semester").notNull(), credits: int("credits").default(0).notNull(), required: int("required").default(1).notNull(),
});

export const certificates = mysqlTable("certificates", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), studentId: int("studentId").notNull(), certificateType: varchar("certificateType", { length: 120 }).notNull(),
  certificateNumber: varchar("certificateNumber", { length: 100 }).notNull(), verificationToken: varchar("verificationToken", { length: 128 }).notNull(), issuedBy: int("issuedBy").notNull(), issuedAt: timestamp("issuedAt").defaultNow().notNull(), revokedAt: timestamp("revokedAt"),
}, table => ({ numberUnique: uniqueIndex("certificates_institution_number_unique").on(table.institutionId, table.certificateNumber), tokenUnique: uniqueIndex("certificates_verification_token_unique").on(table.verificationToken) }));

export const financialAccounts = mysqlTable("financial_accounts", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), studentId: int("studentId").notNull(), status: mysqlEnum("status", ["current", "overdue", "blocked"]).default("current").notNull(), balanceCents: int("balanceCents").default(0).notNull(), dueAt: timestamp("dueAt"), blockedAt: timestamp("blockedAt"), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const financialCharges = mysqlTable("financial_charges", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), studentId: int("studentId").notNull(), concept: varchar("concept", { length: 180 }).notNull(), amountCents: int("amountCents").notNull(), dueAt: timestamp("dueAt").notNull(), status: mysqlEnum("status", ["pending", "partially_paid", "paid", "overdue", "cancelled"]).default("pending").notNull(), createdBy: int("createdBy").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const financialPayments = mysqlTable("financial_payments", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), studentId: int("studentId").notNull(), chargeId: int("chargeId"), amountCents: int("amountCents").notNull(), paymentMethod: varchar("paymentMethod", { length: 80 }).notNull(), reference: varchar("reference", { length: 120 }), receivedBy: int("receivedBy").notNull(), paidAt: timestamp("paidAt").defaultNow().notNull(),
});

export const financialExpenses = mysqlTable("financial_expenses", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), concept: varchar("concept", { length: 180 }).notNull(), amountCents: int("amountCents").notNull(), category: varchar("category", { length: 100 }).notNull(), incurredAt: timestamp("incurredAt").notNull(), createdBy: int("createdBy").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const lmsContents = mysqlTable("lms_contents", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), subjectId: int("subjectId").notNull(), moduleId: int("moduleId"), title: varchar("title", { length: 220 }).notNull(), contentType: mysqlEnum("contentType", ["reading", "video", "link", "file", "task"]).notNull(), body: text("body"), url: varchar("url", { length: 1024 }), fileKey: varchar("fileKey", { length: 512 }), sortOrder: int("sortOrder").default(0).notNull(), published: int("published").default(0).notNull(), createdBy: int("createdBy").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const lmsContentProgress = mysqlTable("lms_content_progress", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), contentId: int("contentId").notNull(), studentId: int("studentId").notNull(), completedAt: timestamp("completedAt"), lastViewedAt: timestamp("lastViewedAt").defaultNow().notNull(),
}, table => ({ progressUnique: uniqueIndex("lms_content_student_unique").on(table.contentId, table.studentId) }));

export const wellbeingSurveys = mysqlTable("wellbeing_surveys", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), title: varchar("title", { length: 220 }).notNull(), audience: mysqlEnum("audience", ["students", "teachers", "alumni"]).notNull(), triggerType: mysqlEnum("triggerType", ["period_end", "annual_alumni", "manual"]).notNull(), anonymous: int("anonymous").default(0).notNull(), active: int("active").default(1).notNull(), createdBy: int("createdBy").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const wellbeingSurveyQuestions = mysqlTable("wellbeing_survey_questions", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), surveyId: int("surveyId").notNull(), prompt: varchar("prompt", { length: 500 }).notNull(), questionType: mysqlEnum("questionType", ["scale", "single_choice", "text"]).notNull(), options: text("options"), sortOrder: int("sortOrder").default(0).notNull(),
});

export const wellbeingSurveyResponses = mysqlTable("wellbeing_survey_responses", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), surveyId: int("surveyId").notNull(), respondentUserId: int("respondentUserId"), submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

export const wellbeingSurveyAnswers = mysqlTable("wellbeing_survey_answers", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), responseId: int("responseId").notNull(), questionId: int("questionId").notNull(), answer: text("answer").notNull(),
});

export const alumniProfiles = mysqlTable("alumni_profiles", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), studentId: int("studentId").notNull(), graduationYear: int("graduationYear"), currentCompany: varchar("currentCompany", { length: 180 }), jobTitle: varchar("jobTitle", { length: 180 }), employmentStatus: mysqlEnum("employmentStatus", ["employed", "self_employed", "seeking", "studying", "unknown"]).default("unknown").notNull(), consentToContact: int("consentToContact").default(0).notNull(), lastContactAt: timestamp("lastContactAt"), notes: text("notes"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const alumniInteractions = mysqlTable("alumni_interactions", {
  id: int("id").autoincrement().primaryKey(), institutionId: int("institutionId").notNull(), alumniProfileId: int("alumniProfileId").notNull(), createdBy: int("createdBy").notNull(), interactionType: mysqlEnum("interactionType", ["call", "email", "event", "survey", "note"]).notNull(), summary: text("summary").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Prospect = typeof prospects.$inferSelect;
export type AdmissionApplication = typeof admissionApplications.$inferSelect;
export type AdmissionDocument = typeof admissionDocuments.$inferSelect;
export type AcademicPeriod = typeof academicPeriods.$inferSelect;
export type ClassSchedule = typeof classSchedules.$inferSelect;
export type StudyPlan = typeof studyPlans.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
export type FinancialAccount = typeof financialAccounts.$inferSelect;
export type FinancialCharge = typeof financialCharges.$inferSelect;
export type FinancialPayment = typeof financialPayments.$inferSelect;
export type FinancialExpense = typeof financialExpenses.$inferSelect;
export type LmsContent = typeof lmsContents.$inferSelect;
export type WellbeingSurvey = typeof wellbeingSurveys.$inferSelect;
export type AlumniProfile = typeof alumniProfiles.$inferSelect;


export const exams = mysqlTable("exams", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").notNull(),
  subjectId: int("subjectId").notNull(),
  moduleId: int("moduleId"),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  instructions: text("instructions"),
  durationMinutes: int("durationMinutes").default(60).notNull(),
  maxAttempts: int("maxAttempts").default(1).notNull(),
  requiresCamera: int("requiresCamera").default(1).notNull(),
  requiresMicrophone: int("requiresMicrophone").default(1).notNull(),
  status: mysqlEnum("status", ["draft", "published", "closed"]).default("draft").notNull(),
  createdBy: int("createdBy").notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const examQuestions = mysqlTable("exam_questions", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").notNull(),
  examId: int("examId").notNull(),
  questionType: mysqlEnum("questionType", ["open", "single_choice", "multiple_choice", "true_false", "fill_blank", "matching", "ordering"]).notNull(),
  prompt: text("prompt").notNull(),
  options: text("options"),
  correctAnswer: text("correctAnswer"),
  rubric: text("rubric"),
  points: int("points").default(1).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const examAttempts = mysqlTable("exam_attempts", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").notNull(),
  examId: int("examId").notNull(),
  studentId: int("studentId").notNull(),
  attemptNumber: int("attemptNumber").notNull(),
  status: mysqlEnum("status", ["in_progress", "submitted", "under_review", "graded", "cancelled"]).default("in_progress").notNull(),
  cameraGranted: int("cameraGranted").default(0).notNull(),
  microphoneGranted: int("microphoneGranted").default(0).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  submittedAt: timestamp("submittedAt"),
  autoScore: int("autoScore"),
  manualScore: int("manualScore"),
  finalScore: int("finalScore"),
  tutorFeedback: text("tutorFeedback"),
});

export const examAnswers = mysqlTable("exam_answers", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").notNull(),
  attemptId: int("attemptId").notNull(),
  questionId: int("questionId").notNull(),
  answer: text("answer").notNull(),
  autoScore: int("autoScore"),
  manualScore: int("manualScore"),
  feedback: text("feedback"),
  isReviewed: int("isReviewed").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const examProctoringEvents = mysqlTable("exam_proctoring_events", {
  id: int("id").autoincrement().primaryKey(),
  institutionId: int("institutionId").notNull(),
  attemptId: int("attemptId").notNull(),
  eventType: mysqlEnum("eventType", ["camera_granted", "camera_revoked", "microphone_granted", "microphone_revoked", "fullscreen_entered", "fullscreen_exited", "tab_hidden", "tab_visible", "technical_error"]).notNull(),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
});
