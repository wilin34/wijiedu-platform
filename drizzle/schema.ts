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
