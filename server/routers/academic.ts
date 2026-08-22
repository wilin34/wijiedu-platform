import { TRPCError } from "@trpc/server";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import * as db from "../db";
import { storagePut } from "../storage";
import { invokeLLM } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";

type AppUser = { id: number; role: string; email?: string | null };
const roleForAccess = (role: string) => (role === "user" ? "student" : role);
const isAdministrator = (user: AppUser) => roleForAccess(user.role) === "admin";
const isTeacher = (user: AppUser) => roleForAccess(user.role) === "teacher";
const isStaff = (user: AppUser) => isAdministrator(user) || isTeacher(user);
const scrypt = promisify(scryptCallback);

function fallbackCourseProposal(input: { topic: string; level: "basic" | "intermediate" | "advanced"; period: string }) {
  const code = `CUR-${input.topic.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase() || "NUEVO"}`;
  return {
    code,
    name: input.topic,
    description: `Propuesta curricular de ${input.topic} para el período ${input.period}.`,
    resources: [
      { title: `Guía introductoria de ${input.topic}`, description: "Material de lectura para orientar el aprendizaje.", resourceType: "reading", url: null },
      { title: "Actividad práctica guiada", description: "Recurso para aplicar los conceptos principales.", resourceType: "document", url: null },
    ],
    competencies: [
      { title: `Comprender fundamentos de ${input.topic}`, description: "Reconoce conceptos, vocabulario y aplicaciones esenciales.", level: "basic" },
      { title: `Aplicar conocimientos de ${input.topic}`, description: "Resuelve situaciones prácticas y argumenta decisiones.", level: input.level },
    ],
  };
}

function forbid(message = "No tienes permiso para realizar esta acción."): never {
  throw new TRPCError({ code: "FORBIDDEN", message });
}

function assertAdmin(user: AppUser) {
  if (!isAdministrator(user)) forbid("Esta acción requiere el rol de administrador.");
}

async function hashAccountPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

async function assertSubjectManager(user: AppUser, subjectId: number) {
  if (isAdministrator(user)) return;
  const subject = await db.getSubjectById(subjectId);
  if (!subject || !isTeacher(user) || subject.teacherId !== user.id) forbid("Solo el docente asignado puede administrar esta materia.");
}

async function ownStudent(user: AppUser) {
  const student = await db.getStudentForUser(user.id, user.email);
  if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Tu cuenta aún no está vinculada a un perfil de estudiante." });
  return student;
}

const studentInput = z.object({
  fullName: z.string().trim().min(2).max(180),
  email: z.string().trim().email().max(320),
  documentId: z.string().trim().max(64).nullable().optional(),
  birthDate: z.string().date().nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  guardianName: z.string().trim().max(180).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

const subjectInput = z.object({
  code: z.string().trim().min(2).max(32),
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5000).nullable().optional(),
  period: z.string().trim().min(2).max(60),
  teacherId: z.number().int().positive().nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#B69A5E"),
  studentIds: z.array(z.number().int().positive()).default([]),
});

const resourceInput = z.object({
  title: z.string().trim().min(2).max(220),
  description: z.string().trim().max(5000).nullable().optional(),
  resourceType: z.enum(["link", "document", "video", "reading"]),
  url: z.string().url().max(1024).nullable().optional(),
});

const competencyInput = z.object({
  title: z.string().trim().min(2).max(220),
  description: z.string().trim().max(5000).nullable().optional(),
  level: z.enum(["basic", "intermediate", "advanced"]),
});

const subjectCreateInput = subjectInput.extend({
  resources: z.array(resourceInput).default([]),
  competencies: z.array(competencyInput).default([]),
});

const fileInput = z.object({
  fileName: z.string().trim().min(1).max(160),
  mimeType: z.string().trim().min(3).max(120),
  base64: z.string().min(1).max(8_400_000),
});

const activityInput = z.object({
  subjectId: z.number().int().positive(),
  title: z.string().trim().min(2).max(220),
  description: z.string().trim().max(5000).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  maxScore: z.number().int().min(1).max(1000).default(100),
  status: z.enum(["draft", "published", "closed"]).default("draft"),
  attachment: fileInput.nullable().optional(),
});

async function uploadAttachment(userId: number, attachment?: z.infer<typeof fileInput> | null, category = "activities") {
  if (!attachment) return {};
  const bytes = Buffer.from(attachment.base64, "base64");
  if (!bytes.length || bytes.length > 6 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "El archivo debe pesar como máximo 6 MB." });
  const safeName = attachment.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileKey = `wijiedu/${userId}/${category}/${Date.now()}-${safeName}`;
  const uploaded = await storagePut(fileKey, bytes, attachment.mimeType);
  return { resourceFileKey: uploaded.key, resourceFileUrl: uploaded.url };
}

export const academicRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => db.getDashboardStats({ ...ctx.user, role: roleForAccess(ctx.user.role) })),

  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      assertAdmin(ctx.user);
      return db.listUsers();
    }),
    setRole: protectedProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["admin", "teacher", "student"]) })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      await db.updateUserRole(input.userId, input.role);
      return { success: true };
    }),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(180), email: z.string().trim().email().max(320), password: z.string().min(8).max(128), role: z.enum(["teacher", "student"]) })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      if (await db.getUserByEmail(input.email)) throw new TRPCError({ code: "CONFLICT", message: "Ya existe una cuenta con este correo." });
      const user = await db.createLocalUser({ name: input.name, email: input.email.toLowerCase(), passwordHash: await hashAccountPassword(input.password), role: input.role });
      return { id: user?.id };
    }),
  }),

  students: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (isAdministrator(ctx.user)) return db.listStudents();
      if (isTeacher(ctx.user)) return db.listStudentsForTeacher(ctx.user.id);
      return [await ownStudent(ctx.user)];
    }),
    create: protectedProcedure.input(studentInput).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      return { id: await db.createStudent(input) };
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: studentInput })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      await db.updateStudent(input.id, input.data);
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      await db.deleteStudent(input.id);
      return { success: true };
    }),
  }),

  subjects: router({
    list: protectedProcedure.query(async ({ ctx }) => db.listSubjectsForUser({ ...ctx.user, role: roleForAccess(ctx.user.role) })),
    create: protectedProcedure.input(subjectCreateInput).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      const { studentIds, resources, competencies, ...subject } = input;
      return { id: await db.createSubjectWithCurriculum({ ...subject, studentIds, resources, competencies, createdBy: ctx.user.id }) };
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: subjectInput.extend({ active: z.boolean() }) })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      await db.updateSubject(input.id, input.data);
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      await db.deleteSubject(input.id);
      return { success: true };
    }),
    enroll: protectedProcedure.input(z.object({ studentId: z.number().int().positive(), subjectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      await db.enrollStudent(input.studentId, input.subjectId);
      return { success: true };
    }),
    unenroll: protectedProcedure.input(z.object({ studentId: z.number().int().positive(), subjectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      await db.removeEnrollment(input.studentId, input.subjectId);
      return { success: true };
    }),
    enrollments: protectedProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      return db.listEnrollmentsForSubject(input.subjectId);
    }),
  }),

  activities: router({
    list: protectedProcedure.query(async ({ ctx }) => db.listActivitiesForUser({ ...ctx.user, role: roleForAccess(ctx.user.role) })),
    create: protectedProcedure.input(activityInput).mutation(async ({ ctx, input }) => {
      await assertSubjectManager(ctx.user, input.subjectId);
      const attachment = await uploadAttachment(ctx.user.id, input.attachment);
      return { id: await db.createActivity({ ...input, ...attachment, createdBy: ctx.user.id, dueAt: input.dueAt ? new Date(input.dueAt) : null }) };
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: activityInput.omit({ subjectId: true }) })).mutation(async ({ ctx, input }) => {
      const activity = await db.getActivityById(input.id);
      if (!activity) throw new TRPCError({ code: "NOT_FOUND", message: "Actividad no encontrada." });
      await assertSubjectManager(ctx.user, activity.subjectId);
      const attachment = await uploadAttachment(ctx.user.id, input.data.attachment);
      await db.updateActivity(input.id, { ...input.data, ...attachment, dueAt: input.data.dueAt ? new Date(input.data.dueAt) : null });
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const activity = await db.getActivityById(input.id);
      if (!activity) throw new TRPCError({ code: "NOT_FOUND", message: "Actividad no encontrada." });
      await assertSubjectManager(ctx.user, activity.subjectId);
      await db.deleteActivity(input.id);
      return { success: true };
    }),
  }),

  grades: router({
    list: protectedProcedure.query(async ({ ctx }) => db.listGradesForUser({ ...ctx.user, role: roleForAccess(ctx.user.role) })),
    create: protectedProcedure.input(z.object({ studentId: z.number().int().positive(), subjectId: z.number().int().positive(), period: z.string().trim().min(1).max(60), title: z.string().trim().min(2).max(220), score: z.number().int().min(0).max(1000), maxScore: z.number().int().min(1).max(1000).default(100), notes: z.string().trim().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => {
      if (!isStaff(ctx.user)) forbid();
      await assertSubjectManager(ctx.user, input.subjectId);
      if (!(await db.isStudentEnrolled(input.studentId, input.subjectId))) throw new TRPCError({ code: "BAD_REQUEST", message: "El estudiante no está inscrito en esta materia." });
      return { id: await db.createGrade({ ...input, gradedBy: ctx.user.id }) };
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: z.object({ period: z.string().trim().min(1).max(60), title: z.string().trim().min(2).max(220), score: z.number().int().min(0).max(1000), maxScore: z.number().int().min(1).max(1000), notes: z.string().trim().max(5000).nullable().optional() }) })).mutation(async ({ ctx, input }) => {
      const grade = await db.getGradeById(input.id);
      if (!grade) throw new TRPCError({ code: "NOT_FOUND", message: "Nota no encontrada." });
      await assertSubjectManager(ctx.user, grade.subjectId);
      await db.updateGrade(input.id, input.data);
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const grade = await db.getGradeById(input.id);
      if (!grade) throw new TRPCError({ code: "NOT_FOUND", message: "Nota no encontrada." });
      await assertSubjectManager(ctx.user, grade.subjectId);
      await db.deleteGrade(input.id);
      return { success: true };
    }),
  }),

  submissions: router({
    list: protectedProcedure.query(async ({ ctx }) => db.listSubmissionsForUser({ ...ctx.user, role: roleForAccess(ctx.user.role) })),
    submit: protectedProcedure.input(z.object({ activityId: z.number().int().positive(), content: z.string().trim().max(5000).nullable().optional(), attachment: fileInput.nullable().optional() })).mutation(async ({ ctx, input }) => {
      if (isStaff(ctx.user)) forbid("Solo los estudiantes pueden entregar actividades.");
      const student = await ownStudent(ctx.user);
      const activity = await db.getActivityById(input.activityId);
      if (!activity || activity.status !== "published") throw new TRPCError({ code: "NOT_FOUND", message: "La actividad no está disponible para entregar." });
      if (!(await db.isStudentEnrolled(student.id, activity.subjectId))) forbid("No estás inscrito en la materia de esta actividad.");
      const uploaded = await uploadAttachment(ctx.user.id, input.attachment, "submissions");
      await db.createSubmission({ activityId: input.activityId, studentId: student.id, content: input.content, fileKey: uploaded.resourceFileKey, fileUrl: uploaded.resourceFileUrl });
      return { success: true };
    }),
    grade: protectedProcedure.input(z.object({ id: z.number().int().positive(), score: z.number().int().min(0).max(1000), feedback: z.string().trim().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => {
      const submission = await db.getSubmissionById(input.id);
      if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Entrega no encontrada." });
      await assertSubjectManager(ctx.user, submission.subjectId);
      await db.gradeSubmission(input.id, { score: input.score, feedback: input.feedback, gradedBy: ctx.user.id });
      return { success: true };
    }),
  }),
  curriculum: router({
    resources: protectedProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      if (!(await db.canAccessSubject({ ...ctx.user, role: roleForAccess(ctx.user.role) }, input.subjectId))) forbid("No tienes acceso a los recursos de esta materia.");
      return db.listCourseResources(input.subjectId);
    }),
    competencies: protectedProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      if (!(await db.canAccessSubject({ ...ctx.user, role: roleForAccess(ctx.user.role) }, input.subjectId))) forbid("No tienes acceso a las competencias de esta materia.");
      return db.listCompetencies(input.subjectId);
    }),
    addResource: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), data: resourceInput })).mutation(async ({ ctx, input }) => {
      await assertSubjectManager(ctx.user, input.subjectId);
      return { id: await db.createCourseResource({ ...input.data, subjectId: input.subjectId, createdBy: ctx.user.id }) };
    }),
    addCompetency: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), data: competencyInput })).mutation(async ({ ctx, input }) => {
      await assertSubjectManager(ctx.user, input.subjectId);
      return { id: await db.createCompetency({ ...input.data, subjectId: input.subjectId }) };
    }),
  }),
  messages: router({
    recipients: protectedProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      if (!(await db.canAccessSubject({ ...ctx.user, role: roleForAccess(ctx.user.role) }, input.subjectId))) forbid();
      const subject = await db.getSubjectById(input.subjectId);
      const students = await db.listMessageRecipients(input.subjectId);
      const teacher = subject?.teacherId ? await db.getUserById(subject.teacherId) : undefined;
      return [...students, ...(teacher ? [{ id: teacher.id, name: teacher.name, email: teacher.email, role: teacher.role }] : [])].filter(person => person.id !== ctx.user.id);
    }),
    list: protectedProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      if (!(await db.canAccessSubject({ ...ctx.user, role: roleForAccess(ctx.user.role) }, input.subjectId))) forbid();
      return db.listMessagesForUser(input.subjectId, ctx.user.id);
    }),
    send: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), recipientId: z.number().int().positive(), body: z.string().trim().min(1).max(5000) })).mutation(async ({ ctx, input }) => {
      if (!(await db.canAccessSubject({ ...ctx.user, role: roleForAccess(ctx.user.role) }, input.subjectId))) forbid();
      const recipients = await db.listMessageRecipients(input.subjectId);
      const subject = await db.getSubjectById(input.subjectId);
      const recipientAllowed = recipients.some(person => person.id === input.recipientId) || subject?.teacherId === input.recipientId || isAdministrator(ctx.user);
      if (!recipientAllowed) forbid("La persona destinataria no pertenece a esta materia.");
      return { id: await db.createMessage({ ...input, senderId: ctx.user.id }) };
    }),
  }),
  ai: router({
    generateCourse: protectedProcedure.input(z.object({ topic: z.string().trim().min(3).max(180), level: z.enum(["basic", "intermediate", "advanced"]), period: z.string().trim().min(2).max(60) })).mutation(async ({ ctx, input }) => {
      if (!isStaff(ctx.user)) forbid("Solo el personal académico puede generar propuestas de curso.");
      const response = await invokeLLM({
        model: "claude-haiku-4-5",
        maxTokens: 1800,
        messages: [
          { role: "system", content: "Eres diseñador curricular. Responde únicamente JSON válido y en español." },
          { role: "user", content: `Diseña una propuesta de curso sobre ${input.topic} para nivel ${input.level} y período ${input.period}. Devuelve JSON con code, name, description, resources (máximo 4 objetos con title, description, resourceType: link/document/video/reading, url opcional) y competencies (máximo 4 objetos con title, description, level: basic/intermediate/advanced). No inventes enlaces externos: usa null para url cuando no haya un enlace verificable.` },
        ],
      });
      const content = response.choices?.[0]?.message.content;
      if (typeof content !== "string") return fallbackCourseProposal(input);
      try { return JSON.parse(content); } catch { return fallbackCourseProposal(input); }
    }),
  }),
});
