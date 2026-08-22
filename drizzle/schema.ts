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

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    passwordHash: varchar("passwordHash", { length: 255 }),
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
    userId: int("userId"),
    fullName: varchar("fullName", { length: 180 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    documentId: varchar("documentId", { length: 64 }),
    birthDate: date("birthDate"),
    phone: varchar("phone", { length: 32 }),
    guardianName: varchar("guardianName", { length: 180 }),
    status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    emailUnique: uniqueIndex("students_email_unique").on(table.email),
    userUnique: uniqueIndex("students_user_unique").on(table.userId),
  })
);

export const subjects = mysqlTable(
  "subjects",
  {
    id: int("id").autoincrement().primaryKey(),
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
  table => ({ codeUnique: uniqueIndex("subjects_code_unique").on(table.code) })
);

export const courseResources = mysqlTable("course_resources", {
  id: int("id").autoincrement().primaryKey(),
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
  subjectId: int("subjectId").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  level: mysqlEnum("level", ["basic", "intermediate", "advanced"]).default("intermediate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const enrollments = mysqlTable(
  "enrollments",
  {
    id: int("id").autoincrement().primaryKey(),
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
  subjectId: int("subjectId").notNull(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Student = typeof students.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Grade = typeof grades.$inferSelect;
export type CourseResource = typeof courseResources.$inferSelect;
export type Competency = typeof competencies.$inferSelect;
export type Message = typeof messages.$inferSelect;
