import { and, asc, avg, count, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
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
  institutionMemberships,
  institutions,
  liveClasses,
  lessonProgress,
  messages,
  moduleAssessmentAttempts,
  moduleAssessments,
  notificationPreferences,
  notifications,
  recoveryRequests,
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

export async function listInstitutions() {
  const db = await requireDb();
  return db.select().from(institutions).orderBy(asc(institutions.name));
}

export async function createInstitution(input: { name: string; slug: string; logoUrl?: string | null; primaryColor?: string; secondaryColor?: string }) {
  const db = await requireDb();
  const result = await db.insert(institutions).values({ name: input.name, slug: input.slug, logoUrl: input.logoUrl || null, primaryColor: input.primaryColor || "#B69A5E", secondaryColor: input.secondaryColor || "#1B201D", status: "active" });
  return Number(result[0].insertId);
}

export async function updateInstitutionBranding(institutionId: number, input: { logoUrl?: string | null; primaryColor?: string; secondaryColor?: string }) {
  const db = await requireDb();
  await db.update(institutions).set(input).where(eq(institutions.id, institutionId));
}

export async function deleteInstitution(institutionId: number) {
  if (institutionId === 1) throw new Error("La institución principal no se puede eliminar.");
  const db = await requireDb();
  return db.transaction(async tx => {
    const administrators = await tx.select({ userId: institutionMemberships.userId, email: users.email })
      .from(institutionMemberships)
      .innerJoin(users, eq(users.id, institutionMemberships.userId))
      .where(and(eq(institutionMemberships.institutionId, institutionId), eq(institutionMemberships.role, "admin")));

    await tx.delete(moduleAssessmentAttempts).where(eq(moduleAssessmentAttempts.institutionId, institutionId));
    await tx.delete(lessonProgress).where(eq(lessonProgress.institutionId, institutionId));
    await tx.delete(submissions).where(eq(submissions.institutionId, institutionId));
    await tx.delete(messages).where(eq(messages.institutionId, institutionId));
    await tx.delete(notifications).where(eq(notifications.institutionId, institutionId));
    await tx.delete(notificationPreferences).where(eq(notificationPreferences.institutionId, institutionId));
    await tx.delete(enrollments).where(eq(enrollments.institutionId, institutionId));
    await tx.delete(grades).where(eq(grades.institutionId, institutionId));
    await tx.delete(liveClasses).where(eq(liveClasses.institutionId, institutionId));
    await tx.delete(activities).where(eq(activities.institutionId, institutionId));
    await tx.delete(moduleAssessments).where(eq(moduleAssessments.institutionId, institutionId));
    await tx.delete(courseLessons).where(eq(courseLessons.institutionId, institutionId));
    await tx.delete(courseModules).where(eq(courseModules.institutionId, institutionId));
    await tx.delete(courseResources).where(eq(courseResources.institutionId, institutionId));
    await tx.delete(competencies).where(eq(competencies.institutionId, institutionId));
    await tx.delete(subjects).where(eq(subjects.institutionId, institutionId));
    await tx.delete(students).where(eq(students.institutionId, institutionId));
    await tx.delete(institutionMemberships).where(eq(institutionMemberships.institutionId, institutionId));
    await tx.delete(institutions).where(eq(institutions.id, institutionId));

    for (const administrator of administrators) {
      if (!administrator.email || administrator.email.toLowerCase() === "wilinton@gmail.com") continue;
      const remaining = await tx.select({ id: institutionMemberships.id }).from(institutionMemberships).where(eq(institutionMemberships.userId, administrator.userId)).limit(1);
      if (!remaining.length) {
        await tx.delete(users).where(eq(users.id, administrator.userId));
      }
    }
    return { success: true };
  });
}

export async function listInstitutionsForUser(userId: number) {
  const db = await requireDb();
  return db.select({ id: institutions.id, name: institutions.name, slug: institutions.slug, logoUrl: institutions.logoUrl, primaryColor: institutions.primaryColor, secondaryColor: institutions.secondaryColor, role: institutionMemberships.role })
    .from(institutionMemberships)
    .innerJoin(institutions, eq(institutions.id, institutionMemberships.institutionId))
    .where(and(eq(institutionMemberships.userId, userId), eq(institutions.status, "active")))
    .orderBy(asc(institutions.name));
}

export async function getInstitutionForUser(userId: number, requestedInstitutionId?: number) {
  const db = await requireDb();
  const conditions = [eq(institutionMemberships.userId, userId), eq(institutions.status, "active")];
  if (requestedInstitutionId) conditions.push(eq(institutionMemberships.institutionId, requestedInstitutionId));
  const [membership] = await db.select({ institutionId: institutionMemberships.institutionId }).from(institutionMemberships).innerJoin(institutions, eq(institutions.id, institutionMemberships.institutionId)).where(and(...conditions)).orderBy(asc(institutionMemberships.institutionId)).limit(1);
  return membership?.institutionId ?? 1;
}

export async function addInstitutionMembership(input: { institutionId: number; userId: number; role: "admin" | "teacher" | "student" }) {
  const db = await requireDb();
  await db.insert(institutionMemberships).values(input).onDuplicateKeyUpdate({ set: { role: input.role } });
}

export async function listInstitutionAdmins(institutionId: number) {
  const db = await requireDb();
  return db.select({ id: users.id, name: users.name, email: users.email, role: institutionMemberships.role })
    .from(institutionMemberships)
    .innerJoin(users, eq(users.id, institutionMemberships.userId))
    .where(and(eq(institutionMemberships.institutionId, institutionId), eq(institutionMemberships.role, "admin")))
    .orderBy(asc(users.name));
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

export async function getUserByIdInInstitution(userId: number, institutionId = 1) {
  const db = await requireDb();
  const result = await db.select({ user: users }).from(users).innerJoin(institutionMemberships, eq(institutionMemberships.userId, users.id)).where(and(eq(users.id, userId), eq(institutionMemberships.institutionId, institutionId))).limit(1);
  return result[0]?.user;
}

export async function getUserByEmail(email: string) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getProfileForUser(userId: number, institutionId = 1) {
  const db = await requireDb();
  const [user] = await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, bio: users.bio, profilePhotoUrl: users.profilePhotoUrl, role: users.role })
    .from(users).innerJoin(institutionMemberships, eq(institutionMemberships.userId, users.id))
    .where(and(eq(users.id, userId), eq(institutionMemberships.institutionId, institutionId))).limit(1);
  if (!user) return undefined;
  const [student] = await db.select({ fullName: students.fullName, documentId: students.documentId, birthDate: students.birthDate, phone: students.phone, guardianName: students.guardianName, profilePhotoUrl: students.profilePhotoUrl })
    .from(students).where(and(eq(students.userId, userId), eq(students.institutionId, institutionId))).limit(1);
  return { ...user, student: student || null };
}

export async function updateProfile(userId: number, institutionId: number, input: { name?: string; phone?: string | null; bio?: string | null; profilePhotoUrl?: string | null }) {
  const db = await requireDb();
  await db.update(users).set({ name: input.name, phone: input.phone, bio: input.bio, profilePhotoUrl: input.profilePhotoUrl }).where(eq(users.id, userId));
  await db.update(students).set({ fullName: input.name, phone: input.phone, profilePhotoUrl: input.profilePhotoUrl }).where(and(eq(students.userId, userId), eq(students.institutionId, institutionId)));
  return getProfileForUser(userId, institutionId);
}

export async function createLocalUser(input: { name: string; email: string; passwordHash: string; role?: "admin" | "teacher" | "student"; institutionId?: number }) {
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
  const institutionId = input.institutionId ?? 1;
  await db.insert(institutionMemberships).values({ institutionId, userId, role: input.role === "admin" ? "admin" : input.role ?? "student" });
  if ((input.role ?? "student") === "student") {
    await db.insert(students).values({ institutionId, userId, fullName: input.name, email: input.email, status: "active" });
  }
  return getUserById(userId);
}

export async function createRecoveryRequest(input: { institutionId: number; userId: number }) {
  const db = await requireDb();
  const existing = await db.select().from(recoveryRequests).where(and(eq(recoveryRequests.institutionId, input.institutionId), eq(recoveryRequests.userId, input.userId), eq(recoveryRequests.status, "pending"))).limit(1);
  if (existing[0]) return existing[0];
  const result = await db.insert(recoveryRequests).values(input);
  const [created] = await db.select().from(recoveryRequests).where(eq(recoveryRequests.id, Number(result[0].insertId))).limit(1);
  return created;
}
export async function listRecoveryRequests(institutionId: number) {
  const db = await requireDb();
  return db.select({ id: recoveryRequests.id, institutionId: recoveryRequests.institutionId, userId: recoveryRequests.userId, status: recoveryRequests.status, requestedAt: recoveryRequests.requestedAt, resolvedAt: recoveryRequests.resolvedAt, resolvedBy: recoveryRequests.resolvedBy, name: users.name, email: users.email, role: users.role }).from(recoveryRequests).innerJoin(users, eq(users.id, recoveryRequests.userId)).where(eq(recoveryRequests.institutionId, institutionId)).orderBy(desc(recoveryRequests.requestedAt));
}
export async function resolveRecoveryRequest(input: { requestId: number; institutionId: number; resolvedBy: number }) {
  const db = await requireDb();
  await db.update(recoveryRequests).set({ status: "resolved", resolvedAt: new Date(), resolvedBy: input.resolvedBy }).where(and(eq(recoveryRequests.id, input.requestId), eq(recoveryRequests.institutionId, input.institutionId), eq(recoveryRequests.status, "pending")));
}

export async function updateLastSignedIn(userId: number) {
  const db = await requireDb();
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}
export async function setTemporaryPassword(input: { userId: number; institutionId: number; passwordHash: string }) {
  const db = await requireDb();
  const member = await getUserByIdInInstitution(input.userId, input.institutionId);
  if (!member) return false;
  await db.update(users).set({ passwordHash: input.passwordHash, mustChangePassword: 1, sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, input.userId));
  return true;
}
export async function completeRequiredPasswordChange(userId: number, passwordHash: string) {
  const db = await requireDb();
  await db.update(users).set({ passwordHash, mustChangePassword: 0, sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, userId));
}

export async function listUsers(institutionId = 1) {
  const db = await requireDb();
  return db.select({ id: users.id, openId: users.openId, name: users.name, email: users.email, loginMethod: users.loginMethod, role: users.role, createdAt: users.createdAt, updatedAt: users.updatedAt, lastSignedIn: users.lastSignedIn })
    .from(users)
    .innerJoin(institutionMemberships, eq(institutionMemberships.userId, users.id))
    .where(eq(institutionMemberships.institutionId, institutionId))
    .orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "admin" | "teacher" | "student") {
  const db = await requireDb();
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function deleteUserAccount(userId: number) {
  const db = await requireDb();
  const studentProfiles = await db.select({ id: students.id }).from(students).where(eq(students.userId, userId));
  const studentIds = studentProfiles.map(profile => profile.id);
  const createdActivities = await db.select({ id: activities.id }).from(activities).where(eq(activities.createdBy, userId));
  const activityIds = createdActivities.map(activity => activity.id);
  const createdAssessments = await db.select({ id: moduleAssessments.id }).from(moduleAssessments).where(eq(moduleAssessments.createdBy, userId));
  const assessmentIds = createdAssessments.map(assessment => assessment.id);
  if (activityIds.length) await db.delete(submissions).where(inArray(submissions.activityId, activityIds));
  if (assessmentIds.length) await db.delete(moduleAssessmentAttempts).where(inArray(moduleAssessmentAttempts.assessmentId, assessmentIds));
  if (studentIds.length) {
    await db.delete(moduleAssessmentAttempts).where(inArray(moduleAssessmentAttempts.studentId, studentIds));
    await db.delete(lessonProgress).where(inArray(lessonProgress.studentId, studentIds));
    await db.delete(enrollments).where(inArray(enrollments.studentId, studentIds));
    await db.delete(grades).where(inArray(grades.studentId, studentIds));
    await db.delete(submissions).where(inArray(submissions.studentId, studentIds));
    await db.delete(students).where(inArray(students.id, studentIds));
  }
  await db.delete(messages).where(or(eq(messages.senderId, userId), eq(messages.recipientId, userId)));
  await db.delete(courseResources).where(eq(courseResources.createdBy, userId));
  await db.delete(liveClasses).where(eq(liveClasses.createdBy, userId));
  if (activityIds.length) await db.delete(activities).where(inArray(activities.id, activityIds));
  if (assessmentIds.length) await db.delete(moduleAssessments).where(inArray(moduleAssessments.id, assessmentIds));
  await db.delete(grades).where(eq(grades.gradedBy, userId));
  await db.delete(submissions).where(eq(submissions.gradedBy, userId));
  await db.update(subjects).set({ teacherId: null }).where(eq(subjects.teacherId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

export async function listStudents(institutionId = 1) {
  const db = await requireDb();
  return db.select().from(students).where(eq(students.institutionId, institutionId)).orderBy(desc(students.createdAt));
}

export async function listStudentsForTeacher(teacherId: number, institutionId = 1) {
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
      profilePhotoUrl: students.profilePhotoUrl,
      status: students.status,
      createdAt: students.createdAt,
      updatedAt: students.updatedAt,
    })
    .from(students)
    .innerJoin(enrollments, eq(enrollments.studentId, students.id))
    .innerJoin(subjects, eq(subjects.id, enrollments.subjectId))
    .where(and(eq(subjects.teacherId, teacherId), eq(subjects.institutionId, institutionId), eq(students.institutionId, institutionId), eq(enrollments.institutionId, institutionId)))
    .orderBy(desc(students.createdAt));
}

export async function getStudentById(studentId: number, institutionId = 1) {
  const db = await requireDb();
  const result = await db.select().from(students).where(and(eq(students.id, studentId), eq(students.institutionId, institutionId))).limit(1);
  return result[0];
}

export async function getStudentForUser(userId: number, email?: string | null, institutionId = 1) {
  const db = await requireDb();
  const condition = email
    ? or(eq(students.userId, userId), eq(students.email, email))
    : eq(students.userId, userId);
  const result = await db.select().from(students).where(and(condition, eq(students.institutionId, institutionId))).limit(1);
  return result[0];
}

export async function createStudent(input: {
  fullName: string;
  email: string;
  documentId?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  guardianName?: string | null;
  profilePhotoUrl?: string | null;
  status?: "active" | "inactive";
  institutionId?: number;
}) {
  const db = await requireDb();
  const result = await db.insert(students).values({
    ...input,
    institutionId: input.institutionId ?? 1,
    birthDate: input.birthDate ? new Date(input.birthDate) : null,
    status: input.status ?? "active",
  });
  return Number(result[0].insertId);
}

export async function updateStudent(
  studentId: number,
  institutionId = 1,
  input: {
    fullName: string;
    email: string;
    documentId?: string | null;
    birthDate?: string | null;
    phone?: string | null;
    guardianName?: string | null;
    profilePhotoUrl?: string | null;
    status: "active" | "inactive";
  }
) {
  const db = await requireDb();
  await db
    .update(students)
    .set({ ...input, birthDate: input.birthDate ? new Date(input.birthDate) : null })
    .where(and(eq(students.id, studentId), eq(students.institutionId, institutionId)));
}

export async function deleteStudent(studentId: number, institutionId = 1) {
  const db = await requireDb();
  await db.delete(enrollments).where(eq(enrollments.studentId, studentId));
  await db.delete(grades).where(eq(grades.studentId, studentId));
  await db.delete(submissions).where(eq(submissions.studentId, studentId));
  await db.delete(students).where(and(eq(students.id, studentId), eq(students.institutionId, institutionId)));
}

export async function listSubjectsForUser(user: { id: number; role: string; email?: string | null; institutionId?: number }) {
  const db = await requireDb();
  const institutionId = user.institutionId ?? 1;
  if (user.role === "admin") return db.select().from(subjects).where(eq(subjects.institutionId, institutionId)).orderBy(desc(subjects.createdAt));
  if (user.role === "teacher") {
    return db.select().from(subjects).where(and(eq(subjects.teacherId, user.id), eq(subjects.institutionId, institutionId))).orderBy(desc(subjects.createdAt));
  }
  const student = await getStudentForUser(user.id, user.email, institutionId);
  if (!student) return [];
  return db
    .select({
      id: subjects.id,
      code: subjects.code,
      name: subjects.name,
      description: subjects.description,
      period: subjects.period,
      teacherId: subjects.teacherId,
      teacherName: users.name,
      teacherEmail: users.email,
      teacherPhotoUrl: users.profilePhotoUrl,
      color: subjects.color,
      active: subjects.active,
      createdAt: subjects.createdAt,
      updatedAt: subjects.updatedAt,
    })
    .from(subjects)
    .leftJoin(users, eq(users.id, subjects.teacherId))
    .innerJoin(enrollments, eq(enrollments.subjectId, subjects.id))
    .where(and(eq(enrollments.studentId, student.id), eq(subjects.institutionId, institutionId), eq(enrollments.institutionId, institutionId)))
    .orderBy(desc(subjects.createdAt));
}

export async function getSubjectById(subjectId: number, institutionId = 1) {
  const db = await requireDb();
  const result = await db.select().from(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.institutionId, institutionId))).limit(1);
  return result[0];
}

export async function createSubject(input: {
  code: string;
  name: string;
  description?: string | null;
  period: string;
  teacherId?: number | null;
  color?: string;
  institutionId?: number;
}) {
  const db = await requireDb();
  const result = await db.insert(subjects).values({ ...input, institutionId: input.institutionId ?? 1, active: 1, color: input.color ?? "#4F8EF7" });
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
    assessment?: { title: string; description: string; questions: AssessmentQuestion[]; passingScore: number };
  }>;
  createdBy: number;
  institutionId?: number;
}) {
  const institutionId = input.institutionId ?? 1;
  const subjectId = await createSubject({ ...input, institutionId });
  for (const studentId of input.studentIds ?? []) await enrollStudent(studentId, subjectId, institutionId);
  for (const resource of input.resources ?? []) await createCourseResource({ ...resource, subjectId, createdBy: input.createdBy, institutionId });
  for (const competency of input.competencies ?? []) await createCompetency({ ...competency, subjectId, institutionId });
  for (let moduleIndex = 0; moduleIndex < (input.modules ?? []).length; moduleIndex += 1) {
    const courseModule = (input.modules ?? [])[moduleIndex];
    const moduleId = await createCourseModule({ ...courseModule, subjectId, sortOrder: moduleIndex + 1, institutionId });
    for (let lessonIndex = 0; lessonIndex < courseModule.lessons.length; lessonIndex += 1) {
      const lesson = courseModule.lessons[lessonIndex];
      await createCourseLesson({ ...lesson, moduleId, sortOrder: lessonIndex + 1, institutionId });
    }
    if (courseModule.assessment) await createModuleAssessment({ ...courseModule.assessment, moduleId, status: "published", createdBy: input.createdBy, institutionId });
  }
  return subjectId;
}

export async function updateSubject(
  subjectId: number,
  institutionId = 1,
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
  await db.update(subjects).set({ ...input, active: input.active ? 1 : 0 }).where(and(eq(subjects.id, subjectId), eq(subjects.institutionId, institutionId)));
}

export async function deleteSubject(subjectId: number, institutionId = 1) {
  const db = await requireDb();
  const activityRows = await db.select({ id: activities.id }).from(activities).where(and(eq(activities.subjectId, subjectId), eq(activities.institutionId, institutionId)));
  const activityIds = activityRows.map(row => row.id);
  const moduleRows = await db.select({ id: courseModules.id }).from(courseModules).where(and(eq(courseModules.subjectId, subjectId), eq(courseModules.institutionId, institutionId)));
  const moduleIds = moduleRows.map(row => row.id);
  const lessonRows = moduleIds.length ? await db.select({ id: courseLessons.id }).from(courseLessons).where(and(inArray(courseLessons.moduleId, moduleIds), eq(courseLessons.institutionId, institutionId))) : [];
  const lessonIds = lessonRows.map(row => row.id);
  const assessmentRows = moduleIds.length ? await db.select({ id: moduleAssessments.id }).from(moduleAssessments).where(and(inArray(moduleAssessments.moduleId, moduleIds), eq(moduleAssessments.institutionId, institutionId))) : [];
  const assessmentIds = assessmentRows.map(row => row.id);
  if (activityIds.length) await db.delete(submissions).where(and(inArray(submissions.activityId, activityIds), eq(submissions.institutionId, institutionId)));
  if (assessmentIds.length) await db.delete(moduleAssessmentAttempts).where(and(inArray(moduleAssessmentAttempts.assessmentId, assessmentIds), eq(moduleAssessmentAttempts.institutionId, institutionId)));
  if (lessonIds.length) await db.delete(lessonProgress).where(and(inArray(lessonProgress.lessonId, lessonIds), eq(lessonProgress.institutionId, institutionId)));
  if (moduleIds.length) await db.delete(courseLessons).where(and(inArray(courseLessons.moduleId, moduleIds), eq(courseLessons.institutionId, institutionId)));
  await db.delete(activities).where(and(eq(activities.subjectId, subjectId), eq(activities.institutionId, institutionId)));
  if (moduleIds.length) await db.delete(moduleAssessments).where(and(inArray(moduleAssessments.moduleId, moduleIds), eq(moduleAssessments.institutionId, institutionId)));
  await db.delete(courseModules).where(and(eq(courseModules.subjectId, subjectId), eq(courseModules.institutionId, institutionId)));
  await db.delete(courseResources).where(and(eq(courseResources.subjectId, subjectId), eq(courseResources.institutionId, institutionId)));
  await db.delete(competencies).where(and(eq(competencies.subjectId, subjectId), eq(competencies.institutionId, institutionId)));
  await db.delete(enrollments).where(and(eq(enrollments.subjectId, subjectId), eq(enrollments.institutionId, institutionId)));
  await db.delete(grades).where(and(eq(grades.subjectId, subjectId), eq(grades.institutionId, institutionId)));
  await db.delete(subjects).where(and(eq(subjects.id, subjectId), eq(subjects.institutionId, institutionId)));
}

export async function enrollStudent(studentId: number, subjectId: number, institutionId = 1) {
  const db = await requireDb();
  await db.insert(enrollments).values({ studentId, subjectId, institutionId }).onDuplicateKeyUpdate({ set: { studentId, institutionId } });
}

export async function removeEnrollment(studentId: number, subjectId: number, institutionId = 1) {
  const db = await requireDb();
  await db.delete(enrollments).where(and(eq(enrollments.studentId, studentId), eq(enrollments.subjectId, subjectId), eq(enrollments.institutionId, institutionId)));
}

export async function listEnrollmentsForSubject(subjectId: number, institutionId = 1) {
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
    .innerJoin(subjects, eq(subjects.id, enrollments.subjectId))
    .where(and(eq(enrollments.subjectId, subjectId), eq(enrollments.institutionId, institutionId), eq(students.institutionId, institutionId), eq(subjects.institutionId, institutionId)))
    .orderBy(students.fullName);
}

export async function isStudentEnrolled(studentId: number, subjectId: number, institutionId = 1) {
  const db = await requireDb();
  const result = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.studentId, studentId), eq(enrollments.subjectId, subjectId), eq(enrollments.institutionId, institutionId)))
    .limit(1);
  return Boolean(result[0]);
}

export async function canAccessSubject(user: { id: number; role: string; email?: string | null; institutionId?: number }, subjectId: number) {
  const institutionId = user.institutionId ?? 1;
  const subject = await getSubjectById(subjectId, institutionId);
  if (!subject) return false;
  if (user.role === "admin") return true;
  if (user.role === "teacher") return subject.teacherId === user.id;
  const student = await getStudentForUser(user.id, user.email, institutionId);
  return Boolean(student && await isStudentEnrolled(student.id, subjectId));
}

export async function listCourseResources(subjectId: number, institutionId = 1) {
  const db = await requireDb();
  return db.select().from(courseResources).where(and(eq(courseResources.subjectId, subjectId), eq(courseResources.institutionId, institutionId))).orderBy(desc(courseResources.createdAt));
}

export async function createCourseResource(input: {
  subjectId: number;
  title: string;
  description?: string | null;
  resourceType: "link" | "document" | "video" | "reading";
  url?: string | null;
  createdBy: number;
  institutionId?: number;
}) {
  const db = await requireDb();
  const result = await db.insert(courseResources).values({ ...input, institutionId: input.institutionId ?? 1 });
  return Number(result[0].insertId);
}

export async function listCompetencies(subjectId: number, institutionId = 1) {
  const db = await requireDb();
  return db.select().from(competencies).where(and(eq(competencies.subjectId, subjectId), eq(competencies.institutionId, institutionId))).orderBy(competencies.createdAt);
}

export async function createCompetency(input: {
  subjectId: number;
  title: string;
  description?: string | null;
  level: "basic" | "intermediate" | "advanced";
  institutionId?: number;
}) {
  const db = await requireDb();
  const result = await db.insert(competencies).values({ ...input, institutionId: input.institutionId ?? 1 });
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
  institutionId?: number;
}) {
  const db = await requireDb();
  const result = await db.insert(courseModules).values({ ...input, institutionId: input.institutionId ?? 1, learningObjectives: JSON.stringify(input.learningObjectives) });
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
  institutionId?: number;
}) {
  const db = await requireDb();
  const result = await db.insert(courseLessons).values({ ...input, institutionId: input.institutionId ?? 1, keyTopics: JSON.stringify(input.keyTopics) });
  return Number(result[0].insertId);
}

export async function listCourseModulesForSubject(subjectId: number, institutionId = 1) {
  const db = await requireDb();
  const modules = await db.select().from(courseModules).where(and(eq(courseModules.subjectId, subjectId), eq(courseModules.institutionId, institutionId))).orderBy(courseModules.sortOrder);
  if (!modules.length) return [];
  const lessons = await db.select().from(courseLessons).where(and(inArray(courseLessons.moduleId, modules.map(item => item.id)), eq(courseLessons.institutionId, institutionId))).orderBy(courseLessons.sortOrder);
  return modules.map(courseModule => ({
    ...courseModule,
    learningObjectives: readStringArray(courseModule.learningObjectives),
    lessons: lessons.filter(lesson => lesson.moduleId === courseModule.id).map(lesson => ({ ...lesson, keyTopics: readStringArray(lesson.keyTopics) })),
  }));
}

export async function getCourseModuleById(moduleId: number, institutionId = 1) {
  const db = await requireDb();
  const result = await db.select().from(courseModules).where(and(eq(courseModules.id, moduleId), eq(courseModules.institutionId, institutionId))).limit(1);
  return result[0];
}

export async function getCourseLessonById(lessonId: number, institutionId = 1) {
  const db = await requireDb();
  const result = await db.select({ lesson: courseLessons }).from(courseLessons).innerJoin(courseModules, eq(courseModules.id, courseLessons.moduleId)).where(and(eq(courseLessons.id, lessonId), eq(courseLessons.institutionId, institutionId), eq(courseModules.institutionId, institutionId))).limit(1);
  return result[0]?.lesson;
}

type AssessmentQuestion = { id: string; prompt: string; options: string[]; correctOption: number; explanation: string };

function readAssessmentQuestions(value: string): AssessmentQuestion[] {
  try {
    const questions = JSON.parse(value);
    if (!Array.isArray(questions)) return [];
    return questions.filter(question => typeof question?.id === "string" && typeof question?.prompt === "string" && Array.isArray(question?.options) && Number.isInteger(question?.correctOption) && typeof question?.explanation === "string");
  } catch {
    return [];
  }
}

export async function createModuleAssessment(input: { moduleId: number; title: string; description: string; questions: AssessmentQuestion[]; passingScore: number; status: "draft" | "published"; createdBy: number; institutionId?: number }) {
  const db = await requireDb();
  const result = await db.insert(moduleAssessments).values({ ...input, institutionId: input.institutionId ?? 1, questions: JSON.stringify(input.questions) });
  if (input.status === "published") {
    const [module] = await db.select({ subjectId: courseModules.subjectId }).from(courseModules).where(eq(courseModules.id, input.moduleId)).limit(1);
    if (module) await notifySubjectStudents(module.subjectId, "assessment", "Nueva evaluación disponible", input.title, `/materias/${module.subjectId}`, input.institutionId ?? 1);
  }
  return Number(result[0].insertId);
}

export async function listModuleAssessments(moduleId: number, includeAnswers = false, institutionId = 1) {
  const db = await requireDb();
  const assessments = await db.select().from(moduleAssessments).where(and(eq(moduleAssessments.moduleId, moduleId), eq(moduleAssessments.institutionId, institutionId))).orderBy(desc(moduleAssessments.createdAt));
  return assessments.map(assessment => ({
    ...assessment,
    questions: readAssessmentQuestions(assessment.questions).map(question => includeAnswers ? question : { id: question.id, prompt: question.prompt, options: question.options }),
  }));
}

export async function getModuleAssessmentById(assessmentId: number, institutionId = 1) {
  const db = await requireDb();
  const assessment = (await db.select().from(moduleAssessments).where(and(eq(moduleAssessments.id, assessmentId), eq(moduleAssessments.institutionId, institutionId))).limit(1))[0];
  if (!assessment) return undefined;
  return {
    ...assessment,
    questions: readAssessmentQuestions(assessment.questions),
  };
}

export async function createModuleAssessmentAttempt(input: { assessmentId: number; studentId: number; answers: Array<{ questionId: string; selectedOption: number }>; score: number; maxScore: number; passed: boolean }) {
  const db = await requireDb();
  const result = await db.insert(moduleAssessmentAttempts).values({ ...input, answers: JSON.stringify(input.answers), passed: input.passed ? 1 : 0 });
  return Number(result[0].insertId);
}

export async function listAssessmentAttemptsForStudent(studentId: number, assessmentIds: number[]) {
  if (!assessmentIds.length) return [];
  const db = await requireDb();
  return db.select().from(moduleAssessmentAttempts).where(and(eq(moduleAssessmentAttempts.studentId, studentId), inArray(moduleAssessmentAttempts.assessmentId, assessmentIds))).orderBy(desc(moduleAssessmentAttempts.completedAt));
}

export async function setLessonCompletion(input: { lessonId: number; studentId: number; completed: boolean; institutionId?: number }) {
  const db = await requireDb();
  const lesson = await getCourseLessonById(input.lessonId, input.institutionId ?? 1);
  if (!lesson) return;
  if (!input.completed) {
    await db.delete(lessonProgress).where(and(eq(lessonProgress.lessonId, input.lessonId), eq(lessonProgress.studentId, input.studentId)));
    return;
  }
  await db.insert(lessonProgress).values({ lessonId: input.lessonId, studentId: input.studentId, institutionId: input.institutionId ?? 1 }).onDuplicateKeyUpdate({ set: { completedAt: new Date() } });
}

export async function listCompletedLessonsForStudent(studentId: number, subjectId: number, institutionId = 1) {
  const db = await requireDb();
  return db.select({ lessonId: lessonProgress.lessonId, completedAt: lessonProgress.completedAt })
    .from(lessonProgress)
    .innerJoin(courseLessons, eq(courseLessons.id, lessonProgress.lessonId))
    .innerJoin(courseModules, eq(courseModules.id, courseLessons.moduleId))
    .where(and(eq(lessonProgress.studentId, studentId), eq(courseModules.subjectId, subjectId), eq(lessonProgress.institutionId, institutionId), eq(courseLessons.institutionId, institutionId), eq(courseModules.institutionId, institutionId)));
}

export async function listMessageRecipients(subjectId: number, institutionId = 1) {
  const db = await requireDb();
  return db
    .selectDistinct({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .innerJoin(students, eq(students.userId, users.id))
    .innerJoin(enrollments, eq(enrollments.studentId, students.id))
    .where(and(eq(enrollments.subjectId, subjectId), eq(enrollments.institutionId, institutionId), eq(students.institutionId, institutionId)));
}

export async function listMessagesForUser(subjectId: number, userId: number, institutionId = 1) {
  const db = await requireDb();
  return db
    .select()
    .from(messages)
    .where(and(eq(messages.subjectId, subjectId), eq(messages.institutionId, institutionId), or(eq(messages.senderId, userId), eq(messages.recipientId, userId))))
    .orderBy(messages.createdAt);
}

export async function createMessage(input: { subjectId: number; senderId: number; recipientId: number; body: string; institutionId?: number }) {
  const db = await requireDb();
  const result = await db.insert(messages).values({ ...input, institutionId: input.institutionId ?? 1 });
  await notifyUserIfEnabled(input.recipientId, "message", "Nuevo mensaje académico", "Has recibido un mensaje de tu docente o estudiante.", `/materias/${input.subjectId}`, input.institutionId ?? 1);
  return Number(result[0].insertId);
}

export async function listActivitiesForUser(user: { id: number; role: string; email?: string | null; institutionId?: number }) {
  const db = await requireDb();
  const institutionId = user.institutionId ?? 1;
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
  if (user.role === "admin") return [];
  if (user.role === "teacher") {
    return db.select(base).from(activities).innerJoin(subjects, eq(subjects.id, activities.subjectId)).where(and(eq(subjects.teacherId, user.id), eq(activities.institutionId, institutionId), eq(subjects.institutionId, institutionId))).orderBy(desc(activities.createdAt));
  }
  const student = await getStudentForUser(user.id, user.email, institutionId);
  if (!student) return [];
  return db
    .select(base)
    .from(activities)
    .innerJoin(subjects, eq(subjects.id, activities.subjectId))
    .innerJoin(enrollments, eq(enrollments.subjectId, subjects.id))
    .where(and(eq(enrollments.studentId, student.id), eq(activities.status, "published"), eq(activities.institutionId, institutionId), eq(subjects.institutionId, institutionId), eq(enrollments.institutionId, institutionId)))
    .orderBy(desc(activities.createdAt));
}

export async function getActivityById(activityId: number, institutionId = 1) {
  const db = await requireDb();
  const result = await db.select().from(activities).where(and(eq(activities.id, activityId), eq(activities.institutionId, institutionId))).limit(1);
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
  institutionId?: number;
}) {
  const db = await requireDb();
  const result = await db.insert(activities).values({ ...input, institutionId: input.institutionId ?? 1 });
  if (input.status === "published") await notifySubjectStudents(input.subjectId, "academic", "Nueva actividad publicada", input.title, `/materias/${input.subjectId}`, input.institutionId ?? 1);
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
  const [existing] = await db.select({ subjectId: activities.subjectId, title: activities.title, status: activities.status, institutionId: activities.institutionId }).from(activities).where(eq(activities.id, activityId)).limit(1);
  await db.update(activities).set(input).where(eq(activities.id, activityId));
  if (existing && input.status === "published" && existing.status !== "published") await notifySubjectStudents(existing.subjectId, "academic", "Nueva actividad publicada", input.title, `/materias/${existing.subjectId}`, existing.institutionId);
}

export async function deleteActivity(activityId: number) {
  const db = await requireDb();
  await db.delete(submissions).where(eq(submissions.activityId, activityId));
  await db.delete(activities).where(eq(activities.id, activityId));
}

export async function listGradesForUser(user: { id: number; role: string; email?: string | null; institutionId?: number }) {
  const db = await requireDb();
  const institutionId = user.institutionId ?? 1;
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
    studentEmail: students.email,
    studentPhotoUrl: students.profilePhotoUrl,
    subjectName: subjects.name,
    subjectCode: subjects.code,
    teacherName: users.name,
    teacherEmail: users.email,
    teacherPhotoUrl: users.profilePhotoUrl,
  };
  const query = db.select(base).from(grades).innerJoin(students, eq(students.id, grades.studentId)).innerJoin(subjects, eq(subjects.id, grades.subjectId)).leftJoin(users, eq(users.id, subjects.teacherId));
  const tenantCondition = and(eq(grades.institutionId, institutionId), eq(students.institutionId, institutionId), eq(subjects.institutionId, institutionId));
  if (user.role === "admin") return [];
  if (user.role === "teacher") return query.where(and(tenantCondition, eq(subjects.teacherId, user.id))).orderBy(desc(grades.gradedAt));
  const student = await getStudentForUser(user.id, user.email, institutionId);
  if (!student) return [];
  return query.where(and(tenantCondition, eq(grades.studentId, student.id))).orderBy(desc(grades.gradedAt));
}

export async function getGradeById(gradeId: number, institutionId = 1) {
  const db = await requireDb();
  const result = await db.select().from(grades).where(and(eq(grades.id, gradeId), eq(grades.institutionId, institutionId))).limit(1);
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
  institutionId?: number;
}) {
  const db = await requireDb();
  const result = await db.insert(grades).values({ ...input, institutionId: input.institutionId ?? 1 });
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

export async function listSubmissionsForUser(user: { id: number; role: string; email?: string | null; institutionId?: number }) {
  const db = await requireDb();
  const institutionId = user.institutionId ?? 1;
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
  const tenantCondition = and(eq(submissions.institutionId, institutionId), eq(activities.institutionId, institutionId), eq(subjects.institutionId, institutionId), eq(students.institutionId, institutionId));
  if (user.role === "admin") return [];
  if (user.role === "teacher") return query.where(and(tenantCondition, eq(subjects.teacherId, user.id))).orderBy(desc(submissions.submittedAt));
  const student = await getStudentForUser(user.id, user.email, institutionId);
  if (!student) return [];
  return query.where(and(tenantCondition, eq(submissions.studentId, student.id))).orderBy(desc(submissions.submittedAt));
}

export async function getSubmissionById(submissionId: number, institutionId = 1) {
  const db = await requireDb();
  const result = await db
    .select({ id: submissions.id, activityId: submissions.activityId, studentId: submissions.studentId, subjectId: activities.subjectId })
    .from(submissions)
    .innerJoin(activities, eq(activities.id, submissions.activityId))
    .where(and(eq(submissions.id, submissionId), eq(submissions.institutionId, institutionId), eq(activities.institutionId, institutionId)))
    .limit(1);
  return result[0];
}

export async function createSubmission(input: {
  activityId: number;
  studentId: number;
  institutionId?: number;
  content?: string | null;
  fileKey?: string | null;
  fileUrl?: string | null;
}) {
  const db = await requireDb();
  await db
    .insert(submissions)
    .values({ ...input, institutionId: input.institutionId ?? 1, status: "pending", submittedAt: new Date() })
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

export async function listLiveClassesForUser(user: { id: number; role: string; email?: string | null; institutionId?: number }) {
  const db = await requireDb();
  const institutionId = user.institutionId ?? 1;
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
  if (user.role === "admin") return query.where(and(eq(liveClasses.institutionId, institutionId), eq(subjects.institutionId, institutionId))).orderBy(liveClasses.startsAt);
  if (user.role === "teacher") return query.where(and(eq(subjects.teacherId, user.id), eq(liveClasses.institutionId, institutionId), eq(subjects.institutionId, institutionId))).orderBy(liveClasses.startsAt);
  const student = await getStudentForUser(user.id, user.email, institutionId);
  if (!student) return [];
  return query.innerJoin(enrollments, eq(enrollments.subjectId, subjects.id)).where(and(eq(enrollments.studentId, student.id), eq(liveClasses.status, "published"), eq(liveClasses.institutionId, institutionId), eq(subjects.institutionId, institutionId), eq(enrollments.institutionId, institutionId))).orderBy(liveClasses.startsAt);
}

export async function getLiveClassById(id: number, institutionId = 1) {
  const db = await requireDb();
  const result = await db.select().from(liveClasses).where(and(eq(liveClasses.id, id), eq(liveClasses.institutionId, institutionId))).limit(1);
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
  institutionId?: number;
}) {
  const db = await requireDb();
  const result = await db.insert(liveClasses).values({ ...input, institutionId: input.institutionId ?? 1 });
  if (input.status === "published") await notifySubjectStudents(input.subjectId, "live_class", "Nueva clase en vivo", input.title, `/clases-en-vivo`, input.institutionId ?? 1);
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
  const [existing] = await db.select({ subjectId: liveClasses.subjectId, title: liveClasses.title, status: liveClasses.status, institutionId: liveClasses.institutionId }).from(liveClasses).where(eq(liveClasses.id, id)).limit(1);
  await db.update(liveClasses).set(input).where(eq(liveClasses.id, id));
  if (existing && input.status === "published" && existing.status !== "published") await notifySubjectStudents(existing.subjectId, "live_class", "Nueva clase en vivo", input.title, `/clases-en-vivo`, existing.institutionId);
}

export async function deleteLiveClass(id: number, institutionId = 1) {
  const db = await requireDb();
  await db.delete(liveClasses).where(and(eq(liveClasses.id, id), eq(liveClasses.institutionId, institutionId)));
}

export async function listNotificationsForUser(userId: number, institutionId = 1, limit = 30) {
  const db = await requireDb();
  return db.select().from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.institutionId, institutionId))).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function countUnreadNotifications(userId: number, institutionId = 1) {
  const db = await requireDb();
  const [result] = await db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.institutionId, institutionId), isNull(notifications.readAt)));
  return Number(result?.value ?? 0);
}

export async function markNotificationRead(userId: number, notificationId: number, institutionId = 1) {
  const db = await requireDb();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId), eq(notifications.institutionId, institutionId)));
}

export async function markAllNotificationsRead(userId: number, institutionId = 1) {
  const db = await requireDb();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), eq(notifications.institutionId, institutionId), isNull(notifications.readAt)));
}

export async function createNotification(input: { userId: number; institutionId?: number; type: "academic" | "assessment" | "live_class" | "message" | "system"; title: string; message: string; href?: string | null }) {
  const db = await requireDb();
  const result = await db.insert(notifications).values({ ...input, institutionId: input.institutionId ?? 1 });
  return Number(result[0].insertId);
}

async function notifyUserIfEnabled(userId: number, type: "academic" | "assessment" | "live_class" | "message", title: string, message: string, href: string, institutionId = 1) {
  const preferences = await getNotificationPreferences(userId, institutionId);
  const enabled = type === "academic" ? preferences.academicEnabled : type === "assessment" ? preferences.assessmentEnabled : type === "live_class" ? preferences.liveClassEnabled : preferences.messageEnabled;
  if (enabled) await createNotification({ userId, institutionId, type, title, message, href });
}

async function notifySubjectStudents(subjectId: number, type: "academic" | "assessment" | "live_class", title: string, message: string, href: string, institutionId = 1) {
  const recipients = await listMessageRecipients(subjectId, institutionId);
  await Promise.all(recipients.filter(recipient => recipient.role === "student").map(recipient => notifyUserIfEnabled(recipient.id, type, title, message, href, institutionId)));
}

export async function getNotificationPreferences(userId: number, institutionId = 1) {
  const db = await requireDb();
  const [existing] = await db.select().from(notificationPreferences).where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.institutionId, institutionId))).limit(1);
  if (existing) return existing;
  await db.insert(notificationPreferences).values({ userId, institutionId });
  const [created] = await db.select().from(notificationPreferences).where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.institutionId, institutionId))).limit(1);
  return created;
}

export async function updateNotificationPreferences(userId: number, input: { academicEnabled: number; assessmentEnabled: number; liveClassEnabled: number; messageEnabled: number; institutionId?: number }) {
  const db = await requireDb();
  await db.insert(notificationPreferences).values({ userId, institutionId: input.institutionId ?? 1, ...input }).onDuplicateKeyUpdate({ set: input });
}

export async function getDashboardStats(user: { id: number; role: string; email?: string | null; institutionId?: number }) {
  const db = await requireDb();
  const institutionId = user.institutionId ?? 1;
  if (user.role === "admin") {
    const [studentTotal] = await db.select({ value: count() }).from(students).where(and(eq(students.status, "active"), eq(students.institutionId, institutionId)));
    const [subjectTotal] = await db.select({ value: count() }).from(subjects).where(and(eq(subjects.active, 1), eq(subjects.institutionId, institutionId)));
    const [activityTotal] = await db.select({ value: count() }).from(activities).where(eq(activities.institutionId, institutionId));
    const [average] = await db.select({ value: avg(grades.score) }).from(grades).where(eq(grades.institutionId, institutionId));
    return { students: Number(studentTotal?.value ?? 0), subjects: Number(subjectTotal?.value ?? 0), activities: Number(activityTotal?.value ?? 0), average: Number(average?.value ?? 0) };
  }
  if (user.role === "teacher") {
    const [subjectTotal] = await db.select({ value: count() }).from(subjects).where(and(eq(subjects.teacherId, user.id), eq(subjects.institutionId, institutionId)));
    const [activityTotal] = await db.select({ value: count() }).from(activities).innerJoin(subjects, eq(subjects.id, activities.subjectId)).where(and(eq(subjects.teacherId, user.id), eq(subjects.institutionId, institutionId), eq(activities.institutionId, institutionId)));
    const [studentTotal] = await db.select({ value: count(sql`distinct ${enrollments.studentId}`) }).from(enrollments).innerJoin(subjects, eq(subjects.id, enrollments.subjectId)).where(and(eq(subjects.teacherId, user.id), eq(subjects.institutionId, institutionId), eq(enrollments.institutionId, institutionId)));
    const [average] = await db.select({ value: avg(grades.score) }).from(grades).innerJoin(subjects, eq(subjects.id, grades.subjectId)).where(and(eq(subjects.teacherId, user.id), eq(subjects.institutionId, institutionId), eq(grades.institutionId, institutionId)));
    return { students: Number(studentTotal?.value ?? 0), subjects: Number(subjectTotal?.value ?? 0), activities: Number(activityTotal?.value ?? 0), average: Number(average?.value ?? 0) };
  }
  const student = await getStudentForUser(user.id, user.email, institutionId);
  if (!student) return { students: 0, subjects: 0, activities: 0, average: 0 };
  const [subjectTotal] = await db.select({ value: count() }).from(enrollments).where(and(eq(enrollments.studentId, student.id), eq(enrollments.institutionId, institutionId)));
  const [activityTotal] = await db.select({ value: count() }).from(activities).innerJoin(enrollments, eq(enrollments.subjectId, activities.subjectId)).where(and(eq(enrollments.studentId, student.id), eq(enrollments.institutionId, institutionId), eq(activities.institutionId, institutionId), eq(activities.status, "published")));
  const [average] = await db.select({ value: avg(grades.score) }).from(grades).where(and(eq(grades.studentId, student.id), eq(grades.institutionId, institutionId)));
  return { students: 1, subjects: Number(subjectTotal?.value ?? 0), activities: Number(activityTotal?.value ?? 0), average: Number(average?.value ?? 0) };
}



export async function updateAccountPassword(userId: number, passwordHash: string) {
  const db = await requireDb();
  await db.update(users).set({ passwordHash, sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, userId));
}
