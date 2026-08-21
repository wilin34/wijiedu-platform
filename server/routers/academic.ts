import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";

type AppUser = { id: number; role: string; email?: string | null };
const roleForAccess = (role: string) => (role === "user" ? "student" : role);
const isAdministrator = (user: AppUser) => roleForAccess(user.role) === "admin";
const isTeacher = (user: AppUser) => roleForAccess(user.role) === "teacher";
const isStaff = (user: AppUser) => isAdministrator(user) || isTeacher(user);

function forbid(message = "No tienes permiso para realizar esta acción."): never {
  throw new TRPCError({ code: "FORBIDDEN", message });
}

function assertAdmin(user: AppUser) {
  if (!isAdministrator(user)) forbid("Esta acción requiere el rol de administrador.");
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
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#4F8EF7"),
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
    create: protectedProcedure.input(subjectInput).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      return { id: await db.createSubject(input) };
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
});
