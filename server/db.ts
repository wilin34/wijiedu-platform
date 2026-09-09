import { and, asc, avg, count, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  activities,
  academicPeriods,
  admissionApplications,
  admissionDocuments,
  classSchedules,
  certificates,
  financialAccounts,
  financialCharges,
  financialExpenses,
  financialPayments,
  lmsContents,
  lmsContentProgress,
  exams,
  examQuestions,
  examAttempts,
  examAnswers,
  examProctoringEvents,
  competencies,
  courseLessons,
  courseModules,
  courseResources,
  enrollments,
  grades,
  prospects,
  prospectActivities,
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
  preEnrollmentRequests,
  recoveryRequests,
  students,
  subjects,
  studyPlans,
  studyPlanSubjects,
  wellbeingSurveys,
  wellbeingSurveyQuestions,
  wellbeingSurveyResponses,
  wellbeingSurveyAnswers,
  alumniProfiles,
  alumniInteractions,
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
  await db.insert(notificationPreferences).values({ userId, institutionId }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
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

export async function listProspects(institutionId: number, status?: "new" | "contacted" | "interested" | "admitted" | "enrolled" | "lost") {
  const db = await requireDb();
  const filters = [eq(prospects.institutionId, institutionId)];
  if (status) filters.push(eq(prospects.status, status));
  return db.select().from(prospects).where(and(...filters)).orderBy(desc(prospects.createdAt));
}

export async function getProspectById(id: number, institutionId: number) {
  const db = await requireDb();
  const [prospect] = await db.select().from(prospects).where(and(eq(prospects.id, id), eq(prospects.institutionId, institutionId))).limit(1);
  return prospect;
}

export async function createProspect(input: {
  institutionId: number; fullName: string; email: string; phone?: string | null; documentId?: string | null;
  interestedProgram?: string | null; source?: string | null; ownerUserId?: number | null; notes?: string | null;
}) {
  const db = await requireDb();
  const result = await db.insert(prospects).values({ ...input, email: input.email.toLowerCase(), status: "new" });
  const [created] = await db.select().from(prospects).where(eq(prospects.id, Number(result[0].insertId))).limit(1);
  return created;
}

export async function updateProspect(id: number, institutionId: number, input: Partial<{
  fullName: string; email: string; phone: string | null; documentId: string | null; interestedProgram: string | null;
  source: string | null; status: "new" | "contacted" | "interested" | "admitted" | "enrolled" | "lost"; ownerUserId: number | null; notes: string | null;
}>, actorId: number) {
  const db = await requireDb();
  const current = await getProspectById(id, institutionId);
  if (!current) return undefined;
  await db.transaction(async tx => {
    await tx.update(prospects).set({ ...input, ...(input.email ? { email: input.email.toLowerCase() } : {}) }).where(and(eq(prospects.id, id), eq(prospects.institutionId, institutionId)));
    if (input.status && input.status !== current.status) {
      await tx.insert(prospectActivities).values({ institutionId, prospectId: id, createdBy: actorId, activityType: "status_change", summary: `Estado cambiado de ${current.status} a ${input.status}` });
    }
  });
  return getProspectById(id, institutionId);
}

export async function addProspectActivity(input: { institutionId: number; prospectId: number; createdBy: number; activityType: "call" | "email" | "meeting" | "note" | "status_change"; summary: string }) {
  const db = await requireDb();
  const prospect = await getProspectById(input.prospectId, input.institutionId);
  if (!prospect) return undefined;
  const result = await db.insert(prospectActivities).values(input);
  const [created] = await db.select().from(prospectActivities).where(eq(prospectActivities.id, Number(result[0].insertId))).limit(1);
  return created;
}

export async function listProspectActivities(prospectId: number, institutionId: number) {
  const db = await requireDb();
  return db.select().from(prospectActivities).where(and(eq(prospectActivities.prospectId, prospectId), eq(prospectActivities.institutionId, institutionId))).orderBy(desc(prospectActivities.createdAt));
}

export async function convertProspectToStudent(input: { prospectId: number; institutionId: number; actorId: number }) {
  const db = await requireDb();
  const prospect = await getProspectById(input.prospectId, input.institutionId);
  if (!prospect) return undefined;
  const [existing] = await db.select().from(students).where(and(eq(students.institutionId, input.institutionId), eq(students.email, prospect.email))).limit(1);
  if (existing) {
    await updateProspect(input.prospectId, input.institutionId, { status: "enrolled", convertedStudentId: existing.id } as never, input.actorId);
    return existing;
  }
  const result = await db.insert(students).values({ institutionId: input.institutionId, fullName: prospect.fullName, email: prospect.email, documentId: prospect.documentId, phone: prospect.phone, status: "active" });
  const studentId = Number(result[0].insertId);
  await updateProspect(input.prospectId, input.institutionId, { status: "enrolled", convertedStudentId: studentId } as never, input.actorId);
  return db.select().from(students).where(eq(students.id, studentId)).limit(1).then(rows => rows[0]);
}

export async function listAdmissionApplications(institutionId: number) {
  const db = await requireDb();
  return db.select({ application: admissionApplications, prospectName: prospects.fullName, prospectEmail: prospects.email })
    .from(admissionApplications)
    .leftJoin(prospects, eq(prospects.id, admissionApplications.prospectId))
    .where(eq(admissionApplications.institutionId, institutionId))
    .orderBy(desc(admissionApplications.createdAt));
}

export async function getAdmissionApplication(id: number, institutionId: number) {
  const db = await requireDb();
  const [application] = await db.select().from(admissionApplications).where(and(eq(admissionApplications.id, id), eq(admissionApplications.institutionId, institutionId))).limit(1);
  return application;
}

export async function createAdmissionApplication(input: { institutionId: number; prospectId?: number | null; applicantUserId?: number | null; programName: string }) {
  const db = await requireDb();
  if (input.prospectId && !(await getProspectById(input.prospectId, input.institutionId))) return undefined;
  const result = await db.insert(admissionApplications).values({ ...input, status: "submitted", submittedAt: new Date() });
  const [created] = await db.select().from(admissionApplications).where(eq(admissionApplications.id, Number(result[0].insertId))).limit(1);
  return created;
}

export async function updateAdmissionApplication(input: { id: number; institutionId: number; status: "draft" | "submitted" | "under_review" | "approved" | "rejected" | "enrolled"; reviewedBy?: number; reviewNotes?: string | null }) {
  const db = await requireDb();
  const current = await getAdmissionApplication(input.id, input.institutionId);
  if (!current) return undefined;
  await db.update(admissionApplications).set({ status: input.status, reviewedBy: input.reviewedBy ?? null, reviewedAt: input.reviewedBy ? new Date() : null, reviewNotes: input.reviewNotes ?? null }).where(and(eq(admissionApplications.id, input.id), eq(admissionApplications.institutionId, input.institutionId)));
  return getAdmissionApplication(input.id, input.institutionId);
}

export async function listAdmissionDocuments(applicationId: number, institutionId: number) {
  const db = await requireDb();
  return db.select().from(admissionDocuments).where(and(eq(admissionDocuments.applicationId, applicationId), eq(admissionDocuments.institutionId, institutionId))).orderBy(desc(admissionDocuments.uploadedAt));
}

export async function addAdmissionDocument(input: { institutionId: number; applicationId: number; documentType: string; originalName: string; fileKey: string; fileUrl: string }) {
  const db = await requireDb();
  if (!(await getAdmissionApplication(input.applicationId, input.institutionId))) return undefined;
  const result = await db.insert(admissionDocuments).values({ ...input, status: "pending" });
  const [created] = await db.select().from(admissionDocuments).where(eq(admissionDocuments.id, Number(result[0].insertId))).limit(1);
  return created;
}

export async function reviewAdmissionDocument(input: { id: number; institutionId: number; status: "pending" | "accepted" | "rejected"; reviewedBy: number; rejectionReason?: string | null }) {
  const db = await requireDb();
  await db.update(admissionDocuments).set({ status: input.status, reviewedBy: input.reviewedBy, reviewedAt: new Date(), rejectionReason: input.rejectionReason ?? null }).where(and(eq(admissionDocuments.id, input.id), eq(admissionDocuments.institutionId, input.institutionId)));
  const [document] = await db.select().from(admissionDocuments).where(and(eq(admissionDocuments.id, input.id), eq(admissionDocuments.institutionId, input.institutionId))).limit(1);
  return document;
}

export async function createPreEnrollmentRequest(input: { institutionId: number; applicationId: number; period: string }) {
  const db = await requireDb();
  if (!(await getAdmissionApplication(input.applicationId, input.institutionId))) return undefined;
  const result = await db.insert(preEnrollmentRequests).values({ ...input, status: "submitted" });
  const [created] = await db.select().from(preEnrollmentRequests).where(eq(preEnrollmentRequests.id, Number(result[0].insertId))).limit(1);
  return created;
}

export async function listPreEnrollmentRequests(institutionId: number) {
  const db = await requireDb();
  return db.select().from(preEnrollmentRequests).where(eq(preEnrollmentRequests.institutionId, institutionId)).orderBy(desc(preEnrollmentRequests.requestedAt));
}

export async function listMyAdmissionApplications(institutionId: number, applicantUserId: number) {
  const db = await requireDb();
  return db.select().from(admissionApplications).where(and(eq(admissionApplications.institutionId, institutionId), eq(admissionApplications.applicantUserId, applicantUserId))).orderBy(desc(admissionApplications.createdAt));
}

export async function bulkCreateProspects(institutionId: number, rows: Array<{ fullName: string; email: string; phone?: string | null; interestedProgram?: string | null; source?: string | null; notes?: string | null }>) {
  const db = await requireDb();
  if (!rows.length) return [];
  await db.insert(prospects).values(rows.map(row => ({ ...row, institutionId, email: row.email.toLowerCase(), status: "new" as const })));
  return db.select().from(prospects).where(eq(prospects.institutionId, institutionId)).orderBy(desc(prospects.createdAt));
}

export async function listClassSchedules(institutionId: number) {
  const db = await requireDb();
  return db.select({ schedule: classSchedules, subjectName: subjects.name, subjectCode: subjects.code }).from(classSchedules).innerJoin(subjects, and(eq(subjects.id, classSchedules.subjectId), eq(subjects.institutionId, institutionId))).where(eq(classSchedules.institutionId, institutionId)).orderBy(asc(classSchedules.weekday), asc(classSchedules.startsAt));
}

export async function createClassSchedule(input: { institutionId: number; subjectId: number; periodId: number; teacherId?: number | null; weekday: number; startsAt: string; endsAt: string; classroom?: string | null; modality: "onsite" | "virtual" | "hybrid" }) {
  const db = await requireDb();
  const [subject] = await db.select().from(subjects).where(and(eq(subjects.id, input.subjectId), eq(subjects.institutionId, input.institutionId))).limit(1);
  if (!subject) return undefined;
  const result = await db.insert(classSchedules).values(input);
  const [created] = await db.select().from(classSchedules).where(eq(classSchedules.id, Number(result[0].insertId))).limit(1);
  return created;
}

export async function listStudyPlans(institutionId: number) {
  const db = await requireDb();
  return db.select().from(studyPlans).where(eq(studyPlans.institutionId, institutionId)).orderBy(desc(studyPlans.updatedAt));
}

export async function createStudyPlan(input: { institutionId: number; name: string; version: string; description?: string | null; createdBy: number }) {
  const db = await requireDb();
  const result = await db.insert(studyPlans).values(input);
  const [created] = await db.select().from(studyPlans).where(eq(studyPlans.id, Number(result[0].insertId))).limit(1);
  return created;
}

export async function issueCertificate(input: { institutionId: number; studentId: number; certificateType: string; certificateNumber: string; verificationToken: string; issuedBy: number }) {
  const db = await requireDb();
  const [student] = await db.select().from(students).where(and(eq(students.id, input.studentId), eq(students.institutionId, input.institutionId))).limit(1);
  if (!student) return undefined;
  const result = await db.insert(certificates).values(input);
  const [created] = await db.select().from(certificates).where(eq(certificates.id, Number(result[0].insertId))).limit(1);
  return created;
}

export async function verifyCertificate(token: string) {
  const db = await requireDb();
  const [certificate] = await db.select().from(certificates).where(and(eq(certificates.verificationToken, token), isNull(certificates.revokedAt))).limit(1);
  return certificate;
}

export async function listFinancialCharges(institutionId: number) {
  const db = await requireDb();
  return db.select({ charge: financialCharges, studentName: students.fullName }).from(financialCharges).innerJoin(students, and(eq(students.id, financialCharges.studentId), eq(students.institutionId, institutionId))).where(eq(financialCharges.institutionId, institutionId)).orderBy(desc(financialCharges.createdAt));
}

export async function createFinancialCharge(input: { institutionId: number; studentId: number; concept: string; amountCents: number; dueAt: Date; createdBy: number }) {
  const db = await requireDb();
  const [student] = await db.select().from(students).where(and(eq(students.id, input.studentId), eq(students.institutionId, input.institutionId))).limit(1);
  if (!student) return undefined;
  const result = await db.insert(financialCharges).values({ ...input, status: "pending" });
  const [created] = await db.select().from(financialCharges).where(eq(financialCharges.id, Number(result[0].insertId))).limit(1);
  await db.insert(financialAccounts).values({ institutionId: input.institutionId, studentId: input.studentId, balanceCents: input.amountCents, status: "current", dueAt: input.dueAt }).onDuplicateKeyUpdate({ set: { balanceCents: sql`${financialAccounts.balanceCents} + ${input.amountCents}`, dueAt: input.dueAt } });
  return created;
}

export async function listFinancialPayments(institutionId: number) {
  const db = await requireDb();
  return db.select({ payment: financialPayments, studentName: students.fullName }).from(financialPayments).innerJoin(students, and(eq(students.id, financialPayments.studentId), eq(students.institutionId, institutionId))).where(eq(financialPayments.institutionId, institutionId)).orderBy(desc(financialPayments.paidAt));
}

export async function createFinancialPayment(input: { institutionId: number; studentId: number; chargeId?: number | null; amountCents: number; paymentMethod: string; reference?: string | null; receivedBy: number }) {
  const db = await requireDb();
  const [student] = await db.select().from(students).where(and(eq(students.id, input.studentId), eq(students.institutionId, input.institutionId))).limit(1);
  if (!student) return undefined;
  const result = await db.insert(financialPayments).values(input);
  await db.update(financialAccounts).set({ balanceCents: sql`GREATEST(0, ${financialAccounts.balanceCents} - ${input.amountCents})`, status: "current" }).where(and(eq(financialAccounts.institutionId, input.institutionId), eq(financialAccounts.studentId, input.studentId)));
  if (input.chargeId) await db.update(financialCharges).set({ status: "paid" }).where(and(eq(financialCharges.id, input.chargeId), eq(financialCharges.institutionId, input.institutionId)));
  const [created] = await db.select().from(financialPayments).where(eq(financialPayments.id, Number(result[0].insertId))).limit(1);
  return created;
}

export async function createFinancialExpense(input: { institutionId: number; concept: string; amountCents: number; category: string; incurredAt: Date; createdBy: number }) {
  const db = await requireDb();
  const result = await db.insert(financialExpenses).values(input);
  const [created] = await db.select().from(financialExpenses).where(eq(financialExpenses.id, Number(result[0].insertId))).limit(1);
  return created;
}

export async function listFinancialExpenses(institutionId: number) {
  const db = await requireDb();
  return db.select().from(financialExpenses).where(eq(financialExpenses.institutionId, institutionId)).orderBy(desc(financialExpenses.incurredAt));
}

export async function listLmsContents(institutionId: number, subjectId?: number, studentId?: number) {
  if (studentId && (await getFinancialAccessStatus(institutionId, studentId)).blocked) return [];
  const db = await requireDb();
  const rows = await db.select({ content: lmsContents, subjectName: subjects.name }).from(lmsContents).innerJoin(subjects, and(eq(subjects.id, lmsContents.subjectId), eq(subjects.institutionId, institutionId))).where(and(eq(lmsContents.institutionId, institutionId), ...(subjectId ? [eq(lmsContents.subjectId, subjectId)] : []), ...(studentId ? [eq(lmsContents.published, 1)] : []))).orderBy(asc(lmsContents.sortOrder), asc(lmsContents.createdAt));
  if (!studentId) return rows;
  const progress = await db.select().from(lmsContentProgress).where(and(eq(lmsContentProgress.institutionId, institutionId), eq(lmsContentProgress.studentId, studentId)));
  const completed = new Map(progress.map(item => [item.contentId, item.completedAt]));
  return rows.map(row => ({ ...row, completedAt: completed.get(row.content.id) ?? null }));
}

export async function createLmsContent(input: { institutionId: number; subjectId: number; moduleId?: number | null; title: string; contentType: "reading" | "video" | "link" | "file" | "task"; body?: string | null; url?: string | null; fileKey?: string | null; createdBy: number }) {
  const db = await requireDb();
  const [subject] = await db.select().from(subjects).where(and(eq(subjects.id, input.subjectId), eq(subjects.institutionId, input.institutionId))).limit(1);
  if (!subject) return undefined;
  const result = await db.insert(lmsContents).values({ ...input, published: 1, sortOrder: 0 });
  const [created] = await db.select().from(lmsContents).where(eq(lmsContents.id, Number(result[0].insertId))).limit(1);
  return created;
}

export async function markLmsContentComplete(input: { institutionId: number; contentId: number; studentId: number; completed: boolean }) {
  const db = await requireDb();
  const [content] = await db.select().from(lmsContents).where(and(eq(lmsContents.id, input.contentId), eq(lmsContents.institutionId, input.institutionId), eq(lmsContents.published, 1))).limit(1);
  if (!content) return undefined;
  await db.insert(lmsContentProgress).values({ institutionId: input.institutionId, contentId: input.contentId, studentId: input.studentId, completedAt: input.completed ? new Date() : null }).onDuplicateKeyUpdate({ set: { completedAt: input.completed ? new Date() : null, lastViewedAt: new Date() } });
  return { contentId: input.contentId, completed: input.completed };
}

type ExamQuestionInput = { questionType: "open" | "single_choice" | "multiple_choice" | "true_false" | "fill_blank" | "matching" | "ordering"; prompt: string; options?: unknown; correctAnswer?: unknown; rubric?: string | null; points: number; sortOrder: number };

export async function createExamWithQuestions(input: { institutionId: number; subjectId: number; moduleId?: number | null; title: string; description?: string | null; instructions?: string | null; durationMinutes: number; maxAttempts: number; requiresCamera: boolean; requiresMicrophone: boolean; createdBy: number; status: "draft" | "published" }, questions: ExamQuestionInput[]) {
  const db = await requireDb();
  const [subject] = await db.select().from(subjects).where(and(eq(subjects.id, input.subjectId), eq(subjects.institutionId, input.institutionId))).limit(1);
  if (!subject) return undefined;
  const result = await db.insert(exams).values({ ...input, requiresCamera: input.requiresCamera ? 1 : 0, requiresMicrophone: input.requiresMicrophone ? 1 : 0, publishedAt: input.status === "published" ? new Date() : null });
  const examId = Number(result[0].insertId);
  if (questions.length) await db.insert(examQuestions).values(questions.map(question => ({ ...question, institutionId: input.institutionId, examId, options: question.options == null ? null : JSON.stringify(question.options), correctAnswer: question.correctAnswer == null ? null : JSON.stringify(question.correctAnswer) })));
  return db.select().from(exams).where(eq(exams.id, examId)).limit(1).then(rows => rows[0]);
}

export async function listExams(institutionId: number, subjectId?: number, studentId?: number) {
  const db = await requireDb();
  return db.select({ exam: exams, subjectName: subjects.name }).from(exams).innerJoin(subjects, and(eq(subjects.id, exams.subjectId), eq(subjects.institutionId, institutionId))).where(and(eq(exams.institutionId, institutionId), ...(subjectId ? [eq(exams.subjectId, subjectId)] : []), ...(studentId ? [eq(exams.status, "published")] : []))).orderBy(desc(exams.createdAt));
}

export async function getExamWithQuestions(examId: number, institutionId: number, studentId?: number) {
  const db = await requireDb();
  const filters = [eq(exams.id, examId), eq(exams.institutionId, institutionId)];
  if (studentId) filters.push(eq(exams.status, "published"));
  const [exam] = await db.select().from(exams).where(and(...filters)).limit(1);
  if (!exam) return undefined;
  const questions = await db.select().from(examQuestions).where(and(eq(examQuestions.examId, examId), eq(examQuestions.institutionId, institutionId))).orderBy(asc(examQuestions.sortOrder));
  return { exam, questions: studentId ? questions.map(question => ({ ...question, correctAnswer: null })) : questions };
}

export async function startExamAttempt(input: { examId: number; institutionId: number; studentId: number; cameraGranted: boolean; microphoneGranted: boolean }) {
  const db = await requireDb();
  const [exam] = await db.select().from(exams).where(and(eq(exams.id, input.examId), eq(exams.institutionId, input.institutionId), eq(exams.status, "published"))).limit(1);
  if (!exam) return undefined;
  if ((await getFinancialAccessStatus(input.institutionId, input.studentId)).blocked) throw new Error("Tu acceso académico está bloqueado por mora. Comunícate con la institución.");
  if ((exam.requiresCamera && !input.cameraGranted) || (exam.requiresMicrophone && !input.microphoneGranted)) throw new Error("Se requieren cámara y micrófono para iniciar el examen.");
  const attempts = await db.select().from(examAttempts).where(and(eq(examAttempts.examId, input.examId), eq(examAttempts.institutionId, input.institutionId), eq(examAttempts.studentId, input.studentId)));
  if (attempts.length >= exam.maxAttempts) throw new Error("Se alcanzó el número máximo de intentos permitido.");
  const attemptNumber = attempts.length + 1;
  const result = await db.insert(examAttempts).values({ examId: input.examId, institutionId: input.institutionId, studentId: input.studentId, attemptNumber, cameraGranted: input.cameraGranted ? 1 : 0, microphoneGranted: input.microphoneGranted ? 1 : 0, status: "in_progress" });
  const attemptId = Number(result[0].insertId);
  await db.insert(examProctoringEvents).values([{ institutionId: input.institutionId, attemptId, eventType: "camera_granted" }, { institutionId: input.institutionId, attemptId, eventType: "microphone_granted" }]);
  return { attemptId, examId: input.examId, attemptNumber, durationMinutes: exam.durationMinutes };
}

function normalizedAnswer(value: unknown) { return JSON.stringify(value).trim().toLowerCase(); }

export async function submitExamAttempt(input: { attemptId: number; institutionId: number; studentId: number; answers: Array<{ questionId: number; answer: unknown }> }) {
  const db = await requireDb();
  const [attempt] = await db.select().from(examAttempts).where(and(eq(examAttempts.id, input.attemptId), eq(examAttempts.institutionId, input.institutionId), eq(examAttempts.studentId, input.studentId), eq(examAttempts.status, "in_progress"))).limit(1);
  if (!attempt) return undefined;
  const questions = await db.select().from(examQuestions).where(and(eq(examQuestions.examId, attempt.examId), eq(examQuestions.institutionId, input.institutionId)));
  let autoScore = 0;
  const values = input.answers.map(answer => {
    const question = questions.find(item => item.id === answer.questionId);
    const objective = question && question.questionType !== "open";
    const isCorrect = objective && question.correctAnswer != null && normalizedAnswer(answer.answer) === normalizedAnswer(JSON.parse(question.correctAnswer));
    const score = isCorrect ? question.points : 0;
    if (objective) autoScore += score;
    return { institutionId: input.institutionId, attemptId: input.attemptId, questionId: answer.questionId, answer: JSON.stringify(answer.answer), autoScore: objective ? score : null, isReviewed: objective ? 1 : 0 };
  });
  if (values.length) await db.insert(examAnswers).values(values);
  const hasOpen = questions.some(question => question.questionType === "open");
  await db.update(examAttempts).set({ status: hasOpen ? "under_review" : "graded", submittedAt: new Date(), autoScore, finalScore: hasOpen ? null : autoScore }).where(eq(examAttempts.id, input.attemptId));
  const maxScore = questions.reduce((total, question) => total + question.points, 0);
  return { attemptId: input.attemptId, examId: attempt.examId, studentId: input.studentId, autoScore, maxScore, requiresTutorReview: hasOpen };
}

export async function addExamProctoringEvent(input: { attemptId: number; institutionId: number; studentId: number; eventType: "camera_granted" | "camera_revoked" | "microphone_granted" | "microphone_revoked" | "fullscreen_entered" | "fullscreen_exited" | "tab_hidden" | "tab_visible" | "technical_error" }) {
  const db = await requireDb();
  const [attempt] = await db.select().from(examAttempts).where(and(eq(examAttempts.id, input.attemptId), eq(examAttempts.institutionId, input.institutionId), eq(examAttempts.studentId, input.studentId))).limit(1);
  if (!attempt) return undefined;
  await db.insert(examProctoringEvents).values({ attemptId: input.attemptId, institutionId: input.institutionId, eventType: input.eventType });
  return { ok: true };
}

export async function listExamAttemptsForTeacher(examId: number, institutionId: number) {
  const db = await requireDb();
  return db.select({ attempt: examAttempts, studentName: students.fullName }).from(examAttempts).innerJoin(students, and(eq(students.id, examAttempts.studentId), eq(students.institutionId, institutionId))).where(and(eq(examAttempts.examId, examId), eq(examAttempts.institutionId, institutionId))).orderBy(desc(examAttempts.startedAt));
}

export async function getExamAttemptForTeacher(attemptId: number, institutionId: number) {
  const db = await requireDb();
  const [attempt] = await db.select().from(examAttempts).where(and(eq(examAttempts.id, attemptId), eq(examAttempts.institutionId, institutionId))).limit(1);
  if (!attempt) return undefined;
  const answers = await db.select().from(examAnswers).where(and(eq(examAnswers.attemptId, attemptId), eq(examAnswers.institutionId, institutionId)));
  const questions = await db.select().from(examQuestions).where(and(eq(examQuestions.examId, attempt.examId), eq(examQuestions.institutionId, institutionId)));
  const [exam] = await db.select().from(exams).where(and(eq(exams.id, attempt.examId), eq(exams.institutionId, institutionId))).limit(1);
  return { attempt, answers, questions, exam };

}

export async function gradeExamAttempt(input: { attemptId: number; institutionId: number; manualScores: Array<{ answerId: number; score: number; feedback?: string | null }>; tutorFeedback?: string | null }) {
  const db = await requireDb();
  const [attempt] = await db.select().from(examAttempts).where(and(eq(examAttempts.id, input.attemptId), eq(examAttempts.institutionId, input.institutionId))).limit(1);
  if (!attempt) return undefined;
  for (const item of input.manualScores) await db.update(examAnswers).set({ manualScore: item.score, feedback: item.feedback ?? null, isReviewed: 1 }).where(and(eq(examAnswers.id, item.answerId), eq(examAnswers.attemptId, input.attemptId), eq(examAnswers.institutionId, input.institutionId)));
  const total = input.manualScores.reduce((sum, item) => sum + item.score, 0) + (attempt.autoScore ?? 0);
  const questions = await db.select({ points: examQuestions.points }).from(examQuestions).where(and(eq(examQuestions.examId, attempt.examId), eq(examQuestions.institutionId, input.institutionId)));
  const maxScore = questions.reduce((sum, item) => sum + item.points, 0);
  await db.update(examAttempts).set({ manualScore: input.manualScores.reduce((sum, item) => sum + item.score, 0), finalScore: total, tutorFeedback: input.tutorFeedback ?? null, status: "graded" }).where(eq(examAttempts.id, input.attemptId));
  return { attemptId: input.attemptId, finalScore: total, maxScore, studentId: attempt.studentId, examId: attempt.examId, status: "graded" as const };
}

export async function createStudyPlanWithSubjects(input: { institutionId: number; name: string; version: string; description?: string | null; createdBy: number }, entries: Array<{ subjectId: number; semester: number; credits: number; required: boolean }>) {
  const db = await requireDb();
  const validSubjects = entries.length ? await db.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.institutionId, input.institutionId), inArray(subjects.id, entries.map(entry => entry.subjectId)))) : [];
  if (validSubjects.length !== entries.length) return undefined;
  const result = await db.insert(studyPlans).values({ ...input, active: 1 });
  const planId = Number(result[0].insertId);
  if (entries.length) await db.insert(studyPlanSubjects).values(entries.map(entry => ({ ...entry, studyPlanId: planId, institutionId: input.institutionId, required: entry.required ? 1 : 0 })));
  return getStudyPlanById(planId, input.institutionId);
}

export async function listStudyPlansDetailed(institutionId: number) {
  const db = await requireDb();
  return db.select().from(studyPlans).where(eq(studyPlans.institutionId, institutionId)).orderBy(desc(studyPlans.createdAt));
}

export async function getStudyPlanById(planId: number, institutionId: number) {
  const db = await requireDb();
  const [plan] = await db.select().from(studyPlans).where(and(eq(studyPlans.id, planId), eq(studyPlans.institutionId, institutionId))).limit(1);
  if (!plan) return undefined;
  const subjectsInPlan = await db.select({ relation: studyPlanSubjects, subject: subjects }).from(studyPlanSubjects).innerJoin(subjects, and(eq(subjects.id, studyPlanSubjects.subjectId), eq(subjects.institutionId, institutionId))).where(and(eq(studyPlanSubjects.studyPlanId, planId), eq(studyPlanSubjects.institutionId, institutionId))).orderBy(asc(studyPlanSubjects.semester), asc(subjects.name));
  const subjectIds = subjectsInPlan.map(item => item.subject.id);
  const competenciesInPlan = subjectIds.length ? await db.select().from(competencies).where(and(eq(competencies.institutionId, institutionId), inArray(competencies.subjectId, subjectIds))) : [];
  return { plan, subjects: subjectsInPlan, competencies: competenciesInPlan };
}

export async function refreshFinancialAccountStatus(institutionId: number, studentId: number) {
  const db = await requireDb();
  const [account] = await db.select().from(financialAccounts).where(and(eq(financialAccounts.institutionId, institutionId), eq(financialAccounts.studentId, studentId))).limit(1);
  if (!account) return { status: "current" as const, balanceCents: 0, blocked: false };
  const overdue = account.balanceCents > 0 && !!account.dueAt && account.dueAt.getTime() < Date.now();
  const status = overdue ? "blocked" : account.balanceCents > 0 ? "current" : "current";
  if (status !== account.status) await db.update(financialAccounts).set({ status, blockedAt: status === "blocked" ? account.blockedAt ?? new Date() : null }).where(and(eq(financialAccounts.id, account.id), eq(financialAccounts.institutionId, institutionId)));
  return { status, balanceCents: account.balanceCents, blocked: status === "blocked" };
}

export async function getFinancialAccessStatus(institutionId: number, studentId: number) {
  return refreshFinancialAccountStatus(institutionId, studentId);
}

export async function gradeLmsTask(input: { institutionId: number; contentId: number; studentId: number; score: number; maxScore: number; feedback?: string | null; gradedBy: number }) {
  const db = await requireDb();
  const [content] = await db.select().from(lmsContents).where(and(eq(lmsContents.id, input.contentId), eq(lmsContents.institutionId, input.institutionId), eq(lmsContents.contentType, "task"))).limit(1);
  if (!content) return undefined;
  const [student] = await db.select().from(students).where(and(eq(students.id, input.studentId), eq(students.institutionId, input.institutionId))).limit(1);
  if (!student) return undefined;
  const enrolled = await isStudentEnrolled(input.studentId, content.subjectId, input.institutionId);
  if (!enrolled) return undefined;
  const gradeId = await createGrade({ studentId: input.studentId, subjectId: content.subjectId, period: new Date().getFullYear().toString(), title: `LMS · ${content.title}`, score: input.score, maxScore: input.maxScore, notes: input.feedback ?? null, gradedBy: input.gradedBy, institutionId: input.institutionId });
  return { gradeId, contentId: input.contentId, studentId: input.studentId, score: input.score, maxScore: input.maxScore };
}

export async function listWellbeingSurveys(institutionId: number, audience?: "students" | "teachers" | "alumni") {
  const db = await requireDb();
  return db.select().from(wellbeingSurveys).where(and(eq(wellbeingSurveys.institutionId, institutionId), eq(wellbeingSurveys.active, 1), ...(audience ? [eq(wellbeingSurveys.audience, audience)] : []))).orderBy(desc(wellbeingSurveys.createdAt));
}

export async function createWellbeingSurvey(input: { institutionId: number; title: string; audience: "students" | "teachers" | "alumni"; triggerType: "period_end" | "annual_alumni" | "manual"; anonymous: boolean; createdBy: number }, questions: Array<{ prompt: string; questionType: "scale" | "single_choice" | "text"; options?: string[] | null; sortOrder: number }>) {
  const db = await requireDb();
  const result = await db.insert(wellbeingSurveys).values({ ...input, anonymous: input.anonymous ? 1 : 0, active: 1 });
  const surveyId = Number(result[0].insertId);
  if (questions.length) await db.insert(wellbeingSurveyQuestions).values(questions.map(question => ({ ...question, institutionId: input.institutionId, surveyId, options: question.options ? JSON.stringify(question.options) : null })));
  return { id: surveyId, survey: (await db.select().from(wellbeingSurveys).where(eq(wellbeingSurveys.id, surveyId)).limit(1))[0] };
}

export async function submitWellbeingResponse(input: { institutionId: number; surveyId: number; respondentUserId?: number | null }, answers: Array<{ questionId: number; answer: string }>) {
  const db = await requireDb();
  const [survey] = await db.select().from(wellbeingSurveys).where(and(eq(wellbeingSurveys.id, input.surveyId), eq(wellbeingSurveys.institutionId, input.institutionId), eq(wellbeingSurveys.active, 1))).limit(1);
  if (!survey) return undefined;
  const questions = await db.select().from(wellbeingSurveyQuestions).where(and(eq(wellbeingSurveyQuestions.surveyId, input.surveyId), eq(wellbeingSurveyQuestions.institutionId, input.institutionId)));
  if (answers.some(answer => !questions.some(question => question.id === answer.questionId))) return undefined;
  const response = await db.insert(wellbeingSurveyResponses).values({ ...input, respondentUserId: survey.anonymous ? null : input.respondentUserId ?? null });
  const responseId = Number(response[0].insertId);
  if (answers.length) await db.insert(wellbeingSurveyAnswers).values(answers.map(answer => ({ ...answer, responseId, institutionId: input.institutionId })));
  return { responseId, surveyId: input.surveyId };
}

export async function listAlumniProfiles(institutionId: number) {
  const db = await requireDb();
  return db.select({ profile: alumniProfiles, studentName: students.fullName, email: users.email }).from(alumniProfiles).innerJoin(students, and(eq(students.id, alumniProfiles.studentId), eq(students.institutionId, institutionId))).leftJoin(users, eq(users.id, students.userId)).where(eq(alumniProfiles.institutionId, institutionId)).orderBy(desc(alumniProfiles.updatedAt));
}

export async function upsertAlumniProfile(input: { institutionId: number; studentId: number; graduationYear?: number | null; currentCompany?: string | null; jobTitle?: string | null; employmentStatus: "employed" | "self_employed" | "seeking" | "studying" | "unknown"; consentToContact: boolean; notes?: string | null }) {
  const db = await requireDb();
  const [student] = await db.select().from(students).where(and(eq(students.id, input.studentId), eq(students.institutionId, input.institutionId))).limit(1);
  if (!student) return undefined;
  await db.insert(alumniProfiles).values({ ...input, consentToContact: input.consentToContact ? 1 : 0 }).onDuplicateKeyUpdate({ set: { graduationYear: input.graduationYear ?? null, currentCompany: input.currentCompany ?? null, jobTitle: input.jobTitle ?? null, employmentStatus: input.employmentStatus, consentToContact: input.consentToContact ? 1 : 0, notes: input.notes ?? null } });
  const [profile] = await db.select().from(alumniProfiles).where(and(eq(alumniProfiles.institutionId, input.institutionId), eq(alumniProfiles.studentId, input.studentId))).limit(1);
  return profile;
}

export async function addAlumniInteraction(input: { institutionId: number; alumniProfileId: number; createdBy: number; interactionType: "call" | "email" | "event" | "survey" | "note"; summary: string }) {
  const db = await requireDb();
  const [profile] = await db.select().from(alumniProfiles).where(and(eq(alumniProfiles.id, input.alumniProfileId), eq(alumniProfiles.institutionId, input.institutionId))).limit(1);
  if (!profile) return undefined;
  const result = await db.insert(alumniInteractions).values(input);
  await db.update(alumniProfiles).set({ lastContactAt: new Date() }).where(and(eq(alumniProfiles.id, input.alumniProfileId), eq(alumniProfiles.institutionId, input.institutionId)));
  return (await db.select().from(alumniInteractions).where(eq(alumniInteractions.id, Number(result[0].insertId))).limit(1))[0];
}

export async function triggerWellbeingNotifications(institutionId: number, triggerType: "period_end" | "annual_alumni") {
  const db = await requireDb();
  const surveys = await db.select().from(wellbeingSurveys).where(and(eq(wellbeingSurveys.institutionId, institutionId), eq(wellbeingSurveys.triggerType, triggerType), eq(wellbeingSurveys.active, 1)));
  let created = 0;
  for (const survey of surveys) {
    const recipients = survey.audience === "alumni"
      ? await db.select({ userId: users.id }).from(alumniProfiles).innerJoin(students, and(eq(students.id, alumniProfiles.studentId), eq(students.institutionId, institutionId))).innerJoin(users, eq(users.id, students.userId)).where(and(eq(alumniProfiles.institutionId, institutionId), eq(alumniProfiles.consentToContact, 1)))
      : survey.audience === "teachers"
        ? await db.select({ userId: users.id }).from(users).innerJoin(institutionMemberships, and(eq(institutionMemberships.userId, users.id), eq(institutionMemberships.institutionId, institutionId))).where(eq(users.role, "teacher"))
        : await db.select({ userId: users.id }).from(users).innerJoin(students, and(eq(students.userId, users.id), eq(students.institutionId, institutionId))).where(eq(users.role, "student"));
    for (const recipient of recipients) {
      const href = `?section=wellbeing&surveyId=${survey.id}`;
      const [existing] = await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.institutionId, institutionId), eq(notifications.userId, recipient.userId), eq(notifications.href, href))).limit(1);
      if (existing) continue;
      await db.insert(notifications).values({ institutionId, userId: recipient.userId, type: "system", title: survey.title, message: "Tu opinión nos ayuda a mejorar la experiencia institucional. Completa esta encuesta.", href });
      created += 1;
    }
  }
  return { surveys: surveys.length, notifications: created };
}

export async function updateExamAttemptRecording(input: { institutionId: number; attemptId: number; studentId: number; recordingKey: string; recordingMimeType: string; recordingConsentAt: Date }) {
  const db = await requireDb();
  const [attempt] = await db.select().from(examAttempts).where(and(eq(examAttempts.id, input.attemptId), eq(examAttempts.institutionId, input.institutionId), eq(examAttempts.studentId, input.studentId))).limit(1);
  if (!attempt) return undefined;
  await db.update(examAttempts).set({ recordingKey: input.recordingKey, recordingMimeType: input.recordingMimeType, recordingConsentAt: input.recordingConsentAt, recordingUploadedAt: new Date() }).where(and(eq(examAttempts.id, input.attemptId), eq(examAttempts.institutionId, input.institutionId), eq(examAttempts.studentId, input.studentId)));
  return { attemptId: input.attemptId, recordingKey: input.recordingKey, recordingMimeType: input.recordingMimeType };
}
