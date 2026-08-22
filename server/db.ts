import { and, avg, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  activities,
  competencies,
  courseLessons,
  courseModules,
  courseResources,
  enrollments,
  grades,
  InsertUser,
  liveClasses,
  messages,
  students,
  subjects,
  submissions,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");
  return db;
}

function readStringArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every(item => typeof item === "string") ? parsed : [];
  } catch {
    return [];
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await requireDb();
  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn ?? new Date(),
    role: user.openId === ENV.ownerOpenId ? "admin" : user.role ?? "student",
  };
  await db.insert(users).values(values).onDuplicateKeyUpdate({
    set: {
      name: values.name,
      email: values.email,
      loginMethod: values.loginMethod,
      lastSignedIn: values.lastSignedIn,
      ...(user.openId === ENV.ownerOpenId ? { role: "admin" as const } : {}),
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(userId: number) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function createLocalUser(input: { name: string; email: string; passwordHash: string; role?: "admin" | "teacher" | "student" }) {
  const db = await requireDb();
  const openId = `local_${crypto.randomUUID().replace(/-/g, "")}`;
  const result = await db.insert(users).values({
    openId,
    name: input.name,
    email: input.email,
    loginMethod: "local",
    passwordHash: input.passwordHash,
    role: input.role ?? "student",
    lastSignedIn: new Date(),
  });
  const userId = Number(result[0].insertId);
  if ((input.role ?? "student") === "student") {
    await db.insert(students).values({ userId, fullName: input.name, email: input.email, status: "active" });
  }
  return getUserById(userId);
}

export async function updateLastSignedIn(userId: number) {
  const db = await requireDb();
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function listUsers() {
  const db = await requireDb();
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "admin" | "teacher" | "student") {
  const db = await requireDb();
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function listStudents() {
  const db = await requireDb();
  return db.select().from(students).orderBy(desc(students.createdAt));
}

export async function listStudentsForTeacher(teacherId: number) {
  const db = await requireDb();
  return db
    .selectDistinct({
      id: students.id,
      userId: students.userId,
      fullName: students.fullName,
      email: students.email,
      documentId: students.documentId,
      birthDate: students.birthDate,
      phone: students.phone,
      guardianName: students.guardianName,
      status: students.status,
      createdAt: students.createdAt,
      updatedAt: students.updatedAt,
    })
    .from(students)
    .innerJoin(enrollments, eq(enrollments.studentId, students.id))
    .innerJoin(subjects, eq(subjects.id, enrollments.subjectId))
    .where(eq(subjects.teacherId, teacherId))
    .orderBy(desc(students.createdAt));
}

export async function getStudentById(studentId: number) {
  const db = await requireDb();
  const result = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  return result[0];
}

export async function getStudentForUser(userId: number, email?: string | null) {
  const db = await requireDb();
  const condition = email
    ? or(eq(students.userId, userId), eq(students.email, email))
    : eq(students.userId, userId);
  const result = await db.select().from(students).where(condition).limit(1);
  return result[0];
}

export async function createStudent(input: {
  fullName: string;
  email: string;
  documentId?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  guardianName?: string | null;
  status?: "active" | "inactive";
}) {
  const db = await requireDb();
  const result = await db.insert(students).values({
    ...input,
    birthDate: input.birthDate ? new Date(input.birthDate) : null,
    status: input.status ?? "active",
  });
  return Number(result[0].insertId);
}

export async function updateStudent(
  studentId: number,
  input: {
    fullName: string;
    email: string;
    documentId?: string | null;
    birthDate?: string | null;
    phone?: string | null;
    guardianName?: string | null;
    status: "active" | "inactive";
  }
) {
  const db = await requireDb();
  await db
    .update(students)
    .set({ ...input, birthDate: input.birthDate ? new Date(input.birthDate) : null })
    .where(eq(students.id, studentId));
}

export async function deleteStudent(studentId: number) {
  const db = await requireDb();
  await db.delete(enrollments).where(eq(enrollments.studentId, studentId));
  await db.delete(grades).where(eq(grades.studentId, studentId));
  await db.delete(submissions).where(eq(submissions.studentId, studentId));
  await db.delete(students).where(eq(students.id, studentId));
}

export async function listSubjectsForUser(user: { id: number; role: string; email?: string | null }) {
  const db = await requireDb();
  if (user.role === "admin") return db.select().from(subjects).orderBy(desc(subjects.createdAt));
  if (user.role === "teacher") {
    return db.select().from(subjects).where(eq(subjects.teacherId, user.id)).orderBy(desc(subjects.createdAt));
  }
  const student = await getStudentForUser(user.id, user.email);
  if (!student) return [];
  return db
    .select({
      id: subjects.id,
      code: subjects.code,
      name: subjects.name,
      description: subjects.description,
      period: subjects.period,
      teacherId: subjects.teacherId,
      color: subjects.color,
      active: subjects.active,
      createdAt: subjects.createdAt,
      updatedAt: subjects.updatedAt,
    })
    .from(subjects)
    .innerJoin(enrollments, eq(enrollments.subjectId, subjects.id))
    .where(eq(enrollments.studentId, student.id))
    .orderBy(desc(subjects.createdAt));
}

export async function getSubjectById(subjectId: number) {
  const db = await requireDb();
  const result = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
  return result[0];
}

export async function createSubject(input: {
  code: string;
  name: string;
  description?: string | null;
  period: string;
  teacherId?: number | null;
  color?: string;
}) {
  const db = await requireDb();
  const result = await db.insert(subjects).values({ ...input, active: 1, color: input.color ?? "#4F8EF7" });
  return Number(result[0].insertId);
}

export async function createSubjectWithCurriculum(input: {
  code: string;
  name: string;
  description?: string | null;
  period: string;
  teacherId?: number | null;
  color?: string;
  studentIds?: number[];
  resources?: Array<{ title: string; description?: string | null; resourceType: "link" | "document" | "video" | "reading"; url?: string | null }>;
  competencies?: Array<{ title: string; description?: string | null; level: "basic" | "intermediate" | "advanced" }>;
  modules?: Array<{
    title: string;
    overview: string;
    learningObjectives: string[];
    estimatedHours: number;
    imageUrl?: string | null;
    imagePrompt?: string | null;
    lessons: Array<{ title: string; summary: string; explanation: string; keyTopics: string[]; classActivity?: string | null }>;
  }>;
  createdBy: number;
}) {
  const subjectId = await createSubject(input);
  for (const studentId of input.studentIds ?? []) await enrollStudent(studentId, subjectId);
  for (const resource of input.resources ?? []) await createCourseResource({ ...resource, subjectId, createdBy: input.createdBy });
  for (const competency of input.competencies ?? []) await createCompetency({ ...competency, subjectId });
  for (let moduleIndex = 0; moduleIndex < (input.modules ?? []).length; moduleIndex += 1) {
    const courseModule = (input.modules ?? [])[moduleIndex];
    const moduleId = await createCourseModule({ ...courseModule, subjectId, sortOrder: moduleIndex + 1 });
    for (let lessonIndex = 0; lessonIndex < courseModule.lessons.length; lessonIndex += 1) {
      const lesson = courseModule.lessons[lessonIndex];
      await createCourseLesson({ ...lesson, moduleId, sortOrder: lessonIndex + 1 });
    }
  }
  return subjectId;
}

export async function updateSubject(
  subjectId: number,
  input: {
    code: string;
    name: string;
    description?: string | null;
    period: string;
    teacherId?: number | null;
    color: string;
    active: boolean;
  }
) {
  const db = await requireDb();
  await db.update(subjects).set({ ...input, active: input.active ? 1 : 0 }).where(eq(subjects.id, subjectId));
}

export async function deleteSubject(subjectId: number) {
  const db = await requireDb();
  const activityRows = await db.select({ id: activities.id }).from(activities).where(eq(activities.subjectId, subjectId));
  const activityIds = activityRows.map(row => row.id);
  const moduleRows = await db.select({ id: courseModules.id }).from(courseModules).where(eq(courseModules.subjectId, subjectId));
  const moduleIds = moduleRows.map(row => row.id);
  if (activityIds.length) await db.delete(submissions).where(inArray(submissions.activityId, activityIds));
  if (moduleIds.length) await db.delete(courseLessons).where(inArray(courseLessons.moduleId, moduleIds));
  await db.delete(activities).where(eq(activities.subjectId, subjectId));
  await db.delete(courseModules).where(eq(courseModules.subjectId, subjectId));
  await db.delete(courseResources).where(eq(courseResources.subjectId, subjectId));
  await db.delete(competencies).where(eq(competencies.subjectId, subjectId));
  await db.delete(enrollments).where(eq(enrollments.subjectId, subjectId));
  await db.delete(grades).where(eq(grades.subjectId, subjectId));
  await db.delete(subjects).where(eq(subjects.id, subjectId));
}

export async function enrollStudent(studentId: number, subjectId: number) {
  const db = await requireDb();
  await db.insert(enrollments).values({ studentId, subjectId }).onDuplicateKeyUpdate({ set: { studentId } });
}

export async function removeEnrollment(studentId: number, subjectId: number) {
  const db = await requireDb();
  await db.delete(enrollments).where(and(eq(enrollments.studentId, studentId), eq(enrollments.subjectId, subjectId)));
}

export async function listEnrollmentsForSubject(subjectId: number) {
  const db = await requireDb();
  return db
    .select({
      id: enrollments.id,
      studentId: students.id,
      fullName: students.fullName,
      email: students.email,
      status: students.status,
      createdAt: enrollments.createdAt,
    })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .where(eq(enrollments.subjectId, subjectId))
    .orderBy(students.fullName);
}

export async function isStudentEnrolled(studentId: number, subjectId: number) {
  const db = await requireDb();
  const result = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.studentId, studentId), eq(enrollments.subjectId, subjectId)))
    .limit(1);
  return Boolean(result[0]);
}

export async function canAccessSubject(user: { id: number; role: string; email?: string | null }, subjectId: number) {
  if (user.role === "admin") return true;
  const subject = await getSubjectById(subjectId);
  if (!subject) return false;
  if (user.role === "teacher") return subject.teacherId === user.id;
  const student = await getStudentForUser(user.id, user.email);
  return Boolean(student && await isStudentEnrolled(student.id, subjectId));
}

export async function listCourseResources(subjectId: number) {
  const db = await requireDb();
  return db.select().from(courseResources).where(eq(courseResources.subjectId, subjectId)).orderBy(desc(courseResources.createdAt));
}

export async function createCourseResource(input: {
  subjectId: number;
  title: string;
  description?: string | null;
  resourceType: "link" | "document" | "video" | "reading";
  url?: string | null;
  createdBy: number;
}) {
  const db = await requireDb();
  const result = await db.insert(courseResources).values(input);
  return Number(result[0].insertId);
}

export async function listCompetencies(subjectId: number) {
  const db = await requireDb();
  return db.select().from(competencies).where(eq(competencies.subjectId, subjectId)).orderBy(competencies.createdAt);
}

export async function createCompetency(input: {
  subjectId: number;
  title: string;
  description?: string | null;
  level: "basic" | "intermediate" | "advanced";
}) {
  const db = await requireDb();
  const result = await db.insert(competencies).values(input);
  return Number(result[0].insertId);
}

export async function createCourseModule(input: {
  subjectId: number;
  title: string;
  overview: string;
  learningObjectives: string[];
  estimatedHours: number;
  imageUrl?: string | null;
  imagePrompt?: string | null;
  sortOrder: number;
}) {
  const db = await requireDb();
  const result = await db.insert(courseModules).values({ ...input, learningObjectives: JSON.stringify(input.learningObjectives) });
  return Number(result[0].insertId);
}

export async function createCourseLesson(input: {
  moduleId: number;
  title: string;
  summary: string;
  explanation: string;
  keyTopics: string[];
  classActivity?: string | null;
  sortOrder: number;
}) {
  const db = await requireDb();
  const result = await db.insert(courseLessons).values({ ...input, keyTopics: JSON.stringify(input.keyTopics) });
  return Number(result[0].insertId);
}

export async function listCourseModulesForSubject(subjectId: number) {
  const db = await requireDb();
  const modules = await db.select().from(courseModules).where(eq(courseModules.subjectId, subjectId)).orderBy(courseModules.sortOrder);
  if (!modules.length) return [];
  const lessons = await db.select().from(courseLessons).where(inArray(courseLessons.moduleId, modules.map(item => item.id))).orderBy(courseLessons.sortOrder);
  return modules.map(courseModule => ({
    ...courseModule,
    learningObjectives: readStringArray(courseModule.learningObjectives),
    lessons: lessons.filter(lesson => lesson.moduleId === courseModule.id).map(lesson => ({ ...lesson, keyTopics: readStringArray(lesson.keyTopics) })),
  }));
}

export async function listMessageRecipients(subjectId: number) {
  const db = await requireDb();
  return db
    .selectDistinct({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .innerJoin(students, eq(students.userId, users.id))
    .innerJoin(enrollments, eq(enrollments.studentId, students.id))
    .where(eq(enrollments.subjectId, subjectId));
}

export async function listMessagesForUser(subjectId: number, userId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(messages)
    .where(and(eq(messages.subjectId, subjectId), or(eq(messages.senderId, userId), eq(messages.recipientId, userId))))
    .orderBy(messages.createdAt);
}

export async function createMessage(input: { subjectId: number; senderId: number; recipientId: number; body: string }) {
  const db = await requireDb();
  const result = await db.insert(messages).values(input);
  return Number(result[0].insertId);
}

export async function listActivitiesForUser(user: { id: number; role: string; email?: string | null }) {
  const db = await requireDb();
  const base = {
    id: activities.id,
    subjectId: activities.subjectId,
    createdBy: activities.createdBy,
    title: activities.title,
    description: activities.description,
    dueAt: activities.dueAt,
    maxScore: activities.maxScore,
    status: activities.status,
    resourceFileKey: activities.resourceFileKey,
    resourceFileUrl: activities.resourceFileUrl,
    createdAt: activities.createdAt,
    updatedAt: activities.updatedAt,
    subjectName: subjects.name,
    subjectCode: subjects.code,
    subjectColor: subjects.color,
  };
  if (user.role === "admin") {
    return db.select(base).from(activities).innerJoin(subjects, eq(subjects.id, activities.subjectId)).orderBy(desc(activities.createdAt));
  }
  if (user.role === "teacher") {
    return db.select(base).from(activities).innerJoin(subjects, eq(subjects.id, activities.subjectId)).where(eq(subjects.teacherId, user.id)).orderBy(desc(activities.createdAt));
  }
  const student = await getStudentForUser(user.id, user.email);
  if (!student) return [];
  return db
    .select(base)
    .from(activities)
    .innerJoin(subjects, eq(subjects.id, activities.subjectId))
    .innerJoin(enrollments, eq(enrollments.subjectId, subjects.id))
    .where(and(eq(enrollments.studentId, student.id), eq(activities.status, "published")))
    .orderBy(desc(activities.createdAt));
}

export async function getActivityById(activityId: number) {
  const db = await requireDb();
  const result = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
  return result[0];
}

export async function createActivity(input: {
  subjectId: number;
  createdBy: number;
  title: string;
  description?: string | null;
  dueAt?: Date | null;
  maxScore: number;
  status: "draft" | "published" | "closed";
  resourceFileKey?: string | null;
  resourceFileUrl?: string | null;
}) {
  const db = await requireDb();
  const result = await db.insert(activities).values(input);
  return Number(result[0].insertId);
}

export async function updateActivity(
  activityId: number,
  input: {
    title: string;
    description?: string | null;
    dueAt?: Date | null;
    maxScore: number;
    status: "draft" | "published" | "closed";
    resourceFileKey?: string | null;
    resourceFileUrl?: string | null;
  }
) {
  const db = await requireDb();
  await db.update(activities).set(input).where(eq(activities.id, activityId));
}

export async function deleteActivity(activityId: number) {
  const db = await requireDb();
  await db.delete(submissions).where(eq(submissions.activityId, activityId));
  await db.delete(activities).where(eq(activities.id, activityId));
}

export async function listGradesForUser(user: { id: number; role: string; email?: string | null }) {
  const db = await requireDb();
  const base = {
    id: grades.id,
    studentId: grades.studentId,
    subjectId: grades.subjectId,
    period: grades.period,
    title: grades.title,
    score: grades.score,
    maxScore: grades.maxScore,
    notes: grades.notes,
    gradedBy: grades.gradedBy,
    gradedAt: grades.gradedAt,
    studentName: students.fullName,
    subjectName: subjects.name,
    subjectCode: subjects.code,
  };
  const query = db.select(base).from(grades).innerJoin(students, eq(students.id, grades.studentId)).innerJoin(subjects, eq(subjects.id, grades.subjectId));
  if (user.role === "admin") return query.orderBy(desc(grades.gradedAt));
  if (user.role === "teacher") return query.where(eq(subjects.teacherId, user.id)).orderBy(desc(grades.gradedAt));
  const student = await getStudentForUser(user.id, user.email);
  if (!student) return [];
  return query.where(eq(grades.studentId, student.id)).orderBy(desc(grades.gradedAt));
}

export async function getGradeById(gradeId: number) {
  const db = await requireDb();
  const result = await db.select().from(grades).where(eq(grades.id, gradeId)).limit(1);
  return result[0];
}

export async function createGrade(input: {
  studentId: number;
  subjectId: number;
  period: string;
  title: string;
  score: number;
  maxScore: number;
  notes?: string | null;
  gradedBy: number;
}) {
  const db = await requireDb();
  const result = await db.insert(grades).values(input);
  return Number(result[0].insertId);
}

export async function updateGrade(
  gradeId: number,
  input: { period: string; title: string; score: number; maxScore: number; notes?: string | null }
) {
  const db = await requireDb();
  await db.update(grades).set(input).where(eq(grades.id, gradeId));
}

export async function deleteGrade(gradeId: number) {
  const db = await requireDb();
  await db.delete(grades).where(eq(grades.id, gradeId));
}

export async function listSubmissionsForUser(user: { id: number; role: string; email?: string | null }) {
  const db = await requireDb();
  const base = {
    id: submissions.id,
    activityId: submissions.activityId,
    studentId: submissions.studentId,
    content: submissions.content,
    fileKey: submissions.fileKey,
    fileUrl: submissions.fileUrl,
    submittedAt: submissions.submittedAt,
    status: submissions.status,
    score: submissions.score,
    feedback: submissions.feedback,
    gradedBy: submissions.gradedBy,
    gradedAt: submissions.gradedAt,
    activityTitle: activities.title,
    maxScore: activities.maxScore,
    subjectId: subjects.id,
    subjectName: subjects.name,
    studentName: students.fullName,
  };
  const query = db
    .select(base)
    .from(submissions)
    .innerJoin(activities, eq(activities.id, submissions.activityId))
    .innerJoin(subjects, eq(subjects.id, activities.subjectId))
    .innerJoin(students, eq(students.id, submissions.studentId));
  if (user.role === "admin") return query.orderBy(desc(submissions.submittedAt));
  if (user.role === "teacher") return query.where(eq(subjects.teacherId, user.id)).orderBy(desc(submissions.submittedAt));
  const student = await getStudentForUser(user.id, user.email);
  if (!student) return [];
  return query.where(eq(submissions.studentId, student.id)).orderBy(desc(submissions.submittedAt));
}

export async function getSubmissionById(submissionId: number) {
  const db = await requireDb();
  const result = await db
    .select({ id: submissions.id, activityId: submissions.activityId, studentId: submissions.studentId, subjectId: activities.subjectId })
    .from(submissions)
    .innerJoin(activities, eq(activities.id, submissions.activityId))
    .where(eq(submissions.id, submissionId))
    .limit(1);
  return result[0];
}

export async function createSubmission(input: {
  activityId: number;
  studentId: number;
  content?: string | null;
  fileKey?: string | null;
  fileUrl?: string | null;
}) {
  const db = await requireDb();
  await db
    .insert(submissions)
    .values({ ...input, status: "pending", submittedAt: new Date() })
    .onDuplicateKeyUpdate({
      set: { content: input.content ?? null, fileKey: input.fileKey ?? null, fileUrl: input.fileUrl ?? null, status: "pending", submittedAt: new Date(), score: null, feedback: null, gradedBy: null, gradedAt: null },
    });
}

export async function gradeSubmission(submissionId: number, input: { score: number; feedback?: string | null; gradedBy: number }) {
  const db = await requireDb();
  await db
    .update(submissions)
    .set({ status: "graded", score: input.score, feedback: input.feedback ?? null, gradedBy: input.gradedBy, gradedAt: new Date() })
    .where(eq(submissions.id, submissionId));
}

export async function listLiveClassesForUser(user: { id: number; role: string; email?: string | null }) {
  const db = await requireDb();
  const base = {
    id: liveClasses.id,
    subjectId: liveClasses.subjectId,
    title: liveClasses.title,
    description: liveClasses.description,
    meetUrl: liveClasses.meetUrl,
    startsAt: liveClasses.startsAt,
    durationMinutes: liveClasses.durationMinutes,
    status: liveClasses.status,
    createdBy: liveClasses.createdBy,
    createdAt: liveClasses.createdAt,
    subjectName: subjects.name,
    subjectCode: subjects.code,
  };
  const query = db.select(base).from(liveClasses).innerJoin(subjects, eq(subjects.id, liveClasses.subjectId));
  if (user.role === "admin") return query.orderBy(liveClasses.startsAt);
  if (user.role === "teacher") return query.where(eq(subjects.teacherId, user.id)).orderBy(liveClasses.startsAt);
  const student = await getStudentForUser(user.id, user.email);
  if (!student) return [];
  return query.innerJoin(enrollments, eq(enrollments.subjectId, subjects.id)).where(and(eq(enrollments.studentId, student.id), eq(liveClasses.status, "published"))).orderBy(liveClasses.startsAt);
}

export async function getLiveClassById(id: number) {
  const db = await requireDb();
  const result = await db.select().from(liveClasses).where(eq(liveClasses.id, id)).limit(1);
  return result[0];
}

export async function createLiveClass(input: {
  subjectId: number;
  title: string;
  description?: string | null;
  meetUrl: string;
  startsAt: Date;
  durationMinutes: number;
  status: "draft" | "published" | "completed" | "cancelled";
  createdBy: number;
}) {
  const db = await requireDb();
  const result = await db.insert(liveClasses).values(input);
  return Number(result[0].insertId);
}

export async function updateLiveClass(id: number, input: {
  title: string;
  description?: string | null;
  meetUrl: string;
  startsAt: Date;
  durationMinutes: number;
  status: "draft" | "published" | "completed" | "cancelled";
}) {
  const db = await requireDb();
  await db.update(liveClasses).set(input).where(eq(liveClasses.id, id));
}

export async function deleteLiveClass(id: number) {
  const db = await requireDb();
  await db.delete(liveClasses).where(eq(liveClasses.id, id));
}

export async function getDashboardStats(user: { id: number; role: string; email?: string | null }) {
  const db = await requireDb();
  if (user.role === "admin") {
    const [studentTotal] = await db.select({ value: count() }).from(students).where(eq(students.status, "active"));
    const [subjectTotal] = await db.select({ value: count() }).from(subjects).where(eq(subjects.active, 1));
    const [activityTotal] = await db.select({ value: count() }).from(activities);
    const [average] = await db.select({ value: avg(grades.score) }).from(grades);
    return { students: Number(studentTotal?.value ?? 0), subjects: Number(subjectTotal?.value ?? 0), activities: Number(activityTotal?.value ?? 0), average: Number(average?.value ?? 0) };
  }
  if (user.role === "teacher") {
    const [subjectTotal] = await db.select({ value: count() }).from(subjects).where(eq(subjects.teacherId, user.id));
    const [activityTotal] = await db.select({ value: count() }).from(activities).innerJoin(subjects, eq(subjects.id, activities.subjectId)).where(eq(subjects.teacherId, user.id));
    const [studentTotal] = await db.select({ value: count(sql`distinct ${enrollments.studentId}`) }).from(enrollments).innerJoin(subjects, eq(subjects.id, enrollments.subjectId)).where(eq(subjects.teacherId, user.id));
    const [average] = await db.select({ value: avg(grades.score) }).from(grades).innerJoin(subjects, eq(subjects.id, grades.subjectId)).where(eq(subjects.teacherId, user.id));
    return { students: Number(studentTotal?.value ?? 0), subjects: Number(subjectTotal?.value ?? 0), activities: Number(activityTotal?.value ?? 0), average: Number(average?.value ?? 0) };
  }
  const student = await getStudentForUser(user.id, user.email);
  if (!student) return { students: 0, subjects: 0, activities: 0, average: 0 };
  const [subjectTotal] = await db.select({ value: count() }).from(enrollments).where(eq(enrollments.studentId, student.id));
  const [activityTotal] = await db.select({ value: count() }).from(activities).innerJoin(enrollments, eq(enrollments.subjectId, activities.subjectId)).where(and(eq(enrollments.studentId, student.id), eq(activities.status, "published")));
  const [average] = await db.select({ value: avg(grades.score) }).from(grades).where(eq(grades.studentId, student.id));
  return { students: 1, subjects: Number(subjectTotal?.value ?? 0), activities: Number(activityTotal?.value ?? 0), average: Number(average?.value ?? 0) };
}
