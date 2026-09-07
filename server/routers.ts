import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { createLocalSession } from "./_core/localSession";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { academicRouter } from "./routers/academic";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { canManageCommercial } from "./permissions";

const scrypt = promisify(scryptCallback);
const localAccountInput = z.object({
  name: z.string().trim().min(2).max(180),
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(128),
});

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

function isPlatformOwner(user: { openId?: string | null; email?: string | null; role?: string }) {
  return user.role === "admin" && (user.openId === ENV.ownerOpenId || user.email?.trim().toLowerCase() === "wilinton@gmail.com");
}

function assertInstitutionAdmin(user: { role?: string }) {
  if (!canManageCommercial((user.role || "student") as "admin" | "teacher" | "student" | "user")) throw new TRPCError({ code: "FORBIDDEN", message: "Solo el administrador institucional puede gestionar este módulo." });
}

async function assertExamManager(user: { id: number; role?: string }, subjectId: number, institutionId: number) {
  if (user.role === "admin") return;
  if (user.role === "teacher") {
    const subject = await db.getSubjectById(subjectId, institutionId);
    if (subject?.teacherId === user.id) return;
  }
  throw new TRPCError({ code: "FORBIDDEN", message: "Solo administración o el docente asignado puede gestionar este examen." });
}

async function passwordMatches(password: string, savedHash: string) {
  const [algorithm, salt, saved] = savedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !saved) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(saved, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function publicUser(user: NonNullable<Awaited<ReturnType<typeof db.getUserById>>>) {
  const owner = user.openId === ENV.ownerOpenId;
  return { id: user.id, name: user.name ?? (owner ? "Wilinton" : null), email: user.email ?? (owner ? "wilinton@gmail.com" : null), role: owner ? "admin" as const : user.role, mustChangePassword: user.mustChangePassword === 1 };
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => (opts.ctx.user ? publicUser(opts.ctx.user) : null)),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  localAuth: router({
    register: publicProcedure.input(localAccountInput).mutation(async ({ ctx, input }) => {
      const existing = await db.getUserByEmail(input.email);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Ya existe una cuenta con este correo." });
      const user = await db.createLocalUser({ name: input.name, email: input.email, passwordHash: await hashPassword(input.password) });
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo crear la cuenta." });
      ctx.res.cookie(COOKIE_NAME, await createLocalSession(user), { ...getSessionCookieOptions(ctx.req), maxAge: 7 * 24 * 60 * 60 * 1000 });
      return publicUser(user);
    }),
    login: publicProcedure.input(z.object({ email: z.string().trim().toLowerCase().email().max(320), password: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user?.passwordHash || !(await passwordMatches(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Datos incorrectos." });
      }
      await db.updateLastSignedIn(user.id);
      ctx.res.cookie(COOKIE_NAME, await createLocalSession(user), { ...getSessionCookieOptions(ctx.req), maxAge: 7 * 24 * 60 * 60 * 1000 });
      return publicUser(user);
    }),
    requestPasswordReset: publicProcedure.input(z.object({ email: z.string().trim().toLowerCase().email().max(320) })).mutation(async ({ input }) => {
      const user = await db.getUserByEmail(input.email);
      if (user) {
        const institutionId = await db.getInstitutionForUser(user.id);
        const request = await db.createRecoveryRequest({ institutionId, userId: user.id });
        if (request?.status === "pending") {
          const admins = await db.listInstitutionAdmins(institutionId);
          await Promise.all(admins.filter(admin => admin.id !== user.id).map(admin => db.createNotification({ userId: admin.id, institutionId, type: "system", title: "Solicitud de recuperación de contraseña", message: `${user.name || user.email || "Un usuario"} solicita una nueva contraseña. Revisa la bandeja de usuarios de tu institución.`, href: `/?view=users&requestId=${request.id}` })));
        }
      }
      return { message: "Tu solicitud fue enviada al administrador de tu institución. Recibirás respuesta en menos de 24 horas." };
    }),
    changePassword: protectedProcedure.input(z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128) })).mutation(async ({ ctx, input }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user?.passwordHash || !(await passwordMatches(input.currentPassword, user.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "La contraseña temporal no es correcta." });
      await db.completeRequiredPasswordChange(user.id, await hashPassword(input.newPassword));
      return { success: true, message: "Contraseña actualizada. Ya puedes continuar." };
    }),
  }),
  institutions: router({
    mine: protectedProcedure.query(({ ctx }) => db.listInstitutionsForUser(ctx.user.id)),
    list: protectedProcedure.query(async ({ ctx }) => {
      if (!isPlatformOwner(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario de WijiEdu puede gestionar instituciones." });
      return db.listInstitutions();
    }),
    admins: protectedProcedure.input(z.object({ institutionId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      if (!isPlatformOwner(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario de WijiEdu puede consultar administradores institucionales." });
      return db.listInstitutionAdmins(input.institutionId);
    }),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(3).max(180), slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/), logoBase64: z.string().max(8_000_000).nullable().optional(), logoFileName: z.string().max(160).nullable().optional(), logoMimeType: z.string().regex(/^image\/(png|jpeg|webp|svg\+xml)$/).nullable().optional(), primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#B69A5E"), secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#1B201D") })).mutation(async ({ ctx, input }) => {
      if (!isPlatformOwner(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario de WijiEdu puede crear instituciones." });
      let logoUrl: string | null = null;
      if (input.logoBase64 && input.logoMimeType) {
        const safeName = (input.logoFileName || "logo").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
        const uploaded = await storagePut(`institutions/logos/${Date.now()}-${safeName}`, Buffer.from(input.logoBase64, "base64"), input.logoMimeType);
        logoUrl = uploaded.url;
      }
      return { id: await db.createInstitution({ name: input.name, slug: input.slug, logoUrl, primaryColor: input.primaryColor, secondaryColor: input.secondaryColor }) };
    }),
    remove: protectedProcedure.input(z.object({ institutionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (!isPlatformOwner(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario de WijiEdu puede eliminar instituciones." });
      if (input.institutionId === 1) throw new TRPCError({ code: "BAD_REQUEST", message: "La institución principal no se puede eliminar." });
      await db.deleteInstitution(input.institutionId);
      return { success: true };
    }),
    addMember: protectedProcedure.input(z.object({ institutionId: z.number().int().positive(), userId: z.number().int().positive(), role: z.enum(["admin", "teacher", "student"]) })).mutation(async ({ ctx, input }) => {
      if (!isPlatformOwner(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario de WijiEdu puede asignar miembros." });
      await db.addInstitutionMembership(input);
      return { success: true };
    }),
    createAdmin: protectedProcedure.input(localAccountInput.extend({ institutionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (!isPlatformOwner(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario de WijiEdu puede crear administradores institucionales." });
      const existing = await db.getUserByEmail(input.email);
      if (existing) {
        await db.addInstitutionMembership({ institutionId: input.institutionId, userId: existing.id, role: "admin" });
        return { id: existing.id, created: false };
      }
      const created = await db.createLocalUser({ name: input.name, email: input.email, passwordHash: await hashPassword(input.password), role: "admin", institutionId: input.institutionId });
      return { id: created?.id, created: true };
    }),

  }),
  commercial: router({
    listProspects: protectedProcedure.input(z.object({ status: z.enum(["new", "contacted", "interested", "admitted", "enrolled", "lost"]).optional() }).optional()).query(async ({ ctx, input }) => {
      assertInstitutionAdmin(ctx.user);
      return db.listProspects(ctx.institutionId ?? 1, input?.status);
    }),
    activities: protectedProcedure.input(z.object({ prospectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      assertInstitutionAdmin(ctx.user);
      const prospect = await db.getProspectById(input.prospectId, ctx.institutionId ?? 1);
      if (!prospect) throw new TRPCError({ code: "NOT_FOUND", message: "Prospecto no encontrado." });
      return db.listProspectActivities(input.prospectId, ctx.institutionId ?? 1);
    }),
    createProspect: protectedProcedure.input(z.object({ fullName: z.string().trim().min(2).max(180), email: z.string().trim().email().max(320), phone: z.string().trim().max(32).nullable().optional(), documentId: z.string().trim().max(64).nullable().optional(), interestedProgram: z.string().trim().max(180).nullable().optional(), source: z.string().trim().max(100).nullable().optional(), ownerUserId: z.number().int().positive().nullable().optional(), notes: z.string().trim().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => {
      assertInstitutionAdmin(ctx.user);
      return db.createProspect({ ...input, institutionId: ctx.institutionId ?? 1 });
    }),
    bulkCreateProspects: protectedProcedure.input(z.object({ rows: z.array(z.object({ fullName: z.string().trim().min(2).max(180), email: z.string().trim().email().max(320), phone: z.string().trim().max(32).nullable().optional(), interestedProgram: z.string().trim().max(180).nullable().optional(), source: z.string().trim().max(100).nullable().optional(), notes: z.string().trim().max(5000).nullable().optional() })).min(1).max(500) })).mutation(async ({ ctx, input }) => { assertInstitutionAdmin(ctx.user); return db.bulkCreateProspects(ctx.institutionId ?? 1, input.rows); }),
    updateProspect: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: z.object({ fullName: z.string().trim().min(2).max(180).optional(), email: z.string().trim().email().max(320).optional(), phone: z.string().trim().max(32).nullable().optional(), documentId: z.string().trim().max(64).nullable().optional(), interestedProgram: z.string().trim().max(180).nullable().optional(), source: z.string().trim().max(100).nullable().optional(), status: z.enum(["new", "contacted", "interested", "admitted", "enrolled", "lost"]).optional(), ownerUserId: z.number().int().positive().nullable().optional(), notes: z.string().trim().max(5000).nullable().optional() }) })).mutation(async ({ ctx, input }) => {
      assertInstitutionAdmin(ctx.user);
      const result = await db.updateProspect(input.id, ctx.institutionId ?? 1, input.data, ctx.user.id);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Prospecto no encontrado." });
      return result;
    }),
    addActivity: protectedProcedure.input(z.object({ prospectId: z.number().int().positive(), activityType: z.enum(["call", "email", "meeting", "note"]), summary: z.string().trim().min(2).max(500) })).mutation(async ({ ctx, input }) => {
      assertInstitutionAdmin(ctx.user);
      const result = await db.addProspectActivity({ ...input, createdBy: ctx.user.id, institutionId: ctx.institutionId ?? 1 });
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Prospecto no encontrado." });
      return result;
    }),
    convertToStudent: protectedProcedure.input(z.object({ prospectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      assertInstitutionAdmin(ctx.user);
      const result = await db.convertProspectToStudent({ prospectId: input.prospectId, institutionId: ctx.institutionId ?? 1, actorId: ctx.user.id });
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Prospecto no encontrado." });
      return result;
    }),
  }),
  exams: router({
    list: protectedProcedure.input(z.object({ subjectId: z.number().int().positive().optional() }).optional()).query(async ({ ctx, input }) => db.listExams(ctx.institutionId ?? 1, input?.subjectId, ctx.user.role === "student" ? ctx.user.id : undefined)),
    get: protectedProcedure.input(z.object({ examId: z.number().int().positive() })).query(async ({ ctx, input }) => { const result = await db.getExamWithQuestions(input.examId, ctx.institutionId ?? 1, ctx.user.role === "student" ? ctx.user.id : undefined); if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Examen no disponible." }); return result; }),
    createManual: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), moduleId: z.number().int().positive().nullable().optional(), title: z.string().trim().min(2).max(220), description: z.string().trim().max(5000).nullable().optional(), instructions: z.string().trim().max(10000).nullable().optional(), durationMinutes: z.number().int().min(1).max(600), maxAttempts: z.number().int().min(1).max(10), requiresCamera: z.boolean(), requiresMicrophone: z.boolean(), status: z.enum(["draft", "published"]), questions: z.array(z.object({ questionType: z.enum(["open", "single_choice", "multiple_choice", "true_false", "fill_blank", "matching", "ordering"]), prompt: z.string().trim().min(2).max(10000), options: z.unknown().optional(), correctAnswer: z.unknown().optional(), rubric: z.string().trim().max(5000).nullable().optional(), points: z.number().int().min(1).max(100), sortOrder: z.number().int().min(0) })).min(1).max(100) })).mutation(async ({ ctx, input }) => { await assertExamManager(ctx.user, input.subjectId, ctx.institutionId ?? 1); const result = await db.createExamWithQuestions({ ...input, institutionId: ctx.institutionId ?? 1, createdBy: ctx.user.id }, input.questions); if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "La materia no pertenece a la institución activa." }); return result; }),
    generateWithAI: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), topic: z.string().trim().min(2).max(500), questionCount: z.number().int().min(1).max(30), difficulty: z.enum(["basic", "intermediate", "advanced"]), questionTypes: z.array(z.enum(["open", "single_choice", "multiple_choice", "true_false", "fill_blank", "matching", "ordering"])).min(1).max(7) })).mutation(async ({ ctx, input }) => { await assertExamManager(ctx.user, input.subjectId, ctx.institutionId ?? 1); const response = await invokeLLM({ messages: [{ role: "system", content: "Genera exámenes educativos rigurosos. Devuelve únicamente JSON válido y crea preguntas claras, variadas y calificables." }, { role: "user", content: `Materia: ${input.subjectId}. Tema: ${input.topic}. Dificultad: ${input.difficulty}. Cantidad: ${input.questionCount}. Tipos permitidos: ${input.questionTypes.join(", ")}. Las preguntas abiertas deben incluir rúbrica y no deben tener respuesta correcta automática.` }], response_format: { type: "json_schema", json_schema: { name: "exam_proposal", strict: true, schema: { type: "object", properties: { title: { type: "string" }, instructions: { type: "string" }, questions: { type: "array", items: { type: "object", properties: { questionType: { type: "string", enum: input.questionTypes }, prompt: { type: "string" }, options: {}, correctAnswer: {}, rubric: { type: ["string", "null"] }, points: { type: "integer" } }, required: ["questionType", "prompt", "options", "correctAnswer", "rubric", "points"], additionalProperties: false } } }, required: ["title", "instructions", "questions"], additionalProperties: false } } } }); const content = response.choices?.[0]?.message?.content; if (typeof content !== "string") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La IA no devolvió una propuesta válida." }); try { return JSON.parse(content); } catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La propuesta de IA no tiene un formato válido." }); } }),
    attempts: protectedProcedure.input(z.object({ examId: z.number().int().positive() })).query(async ({ ctx, input }) => { await assertExamManager(ctx.user, (await db.getExamWithQuestions(input.examId, ctx.institutionId ?? 1))?.exam.subjectId ?? -1, ctx.institutionId ?? 1); return db.listExamAttemptsForTeacher(input.examId, ctx.institutionId ?? 1); }),
    attemptReview: protectedProcedure.input(z.object({ attemptId: z.number().int().positive() })).query(async ({ ctx, input }) => { if (ctx.user.role !== "admin" && ctx.user.role !== "teacher") throw new TRPCError({ code: "FORBIDDEN", message: "Solo un tutor puede revisar intentos." }); return db.getExamAttemptForTeacher(input.attemptId, ctx.institutionId ?? 1); }),
    gradeAttempt: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), manualScores: z.array(z.object({ answerId: z.number().int().positive(), score: z.number().int().min(0).max(100), feedback: z.string().trim().max(5000).nullable().optional() })), tutorFeedback: z.string().trim().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "admin" && ctx.user.role !== "teacher") throw new TRPCError({ code: "FORBIDDEN", message: "Solo un tutor puede calificar intentos." }); const result = await db.gradeExamAttempt({ ...input, institutionId: ctx.institutionId ?? 1 }); if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Intento no disponible." }); const exam = await db.getExamWithQuestions(result.examId, ctx.institutionId ?? 1); if (exam) await db.createGrade({ studentId: result.studentId, subjectId: exam.exam.subjectId, period: new Date().getFullYear().toString(), title: exam.exam.title, score: result.finalScore, maxScore: result.maxScore, notes: input.tutorFeedback ?? null, gradedBy: ctx.user.id, institutionId: ctx.institutionId ?? 1 }); return result; }),
    startAttempt: protectedProcedure.input(z.object({ examId: z.number().int().positive(), cameraGranted: z.boolean(), microphoneGranted: z.boolean() })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "student") throw new TRPCError({ code: "FORBIDDEN", message: "Solo estudiantes pueden presentar exámenes." }); try { const result = await db.startExamAttempt({ ...input, institutionId: ctx.institutionId ?? 1, studentId: ctx.user.id }); if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Examen no disponible." }); return result; } catch (error) { if (error instanceof TRPCError) throw error; throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "No se pudo iniciar el examen." }); } }),
    submitAttempt: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), answers: z.array(z.object({ questionId: z.number().int().positive(), answer: z.unknown() })).max(100) })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "student") throw new TRPCError({ code: "FORBIDDEN", message: "Solo estudiantes pueden enviar exámenes." }); const result = await db.submitExamAttempt({ ...input, institutionId: ctx.institutionId ?? 1, studentId: ctx.user.id }); if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Intento no disponible." }); return result; }),
    proctoringEvent: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), eventType: z.enum(["camera_granted", "camera_revoked", "microphone_granted", "microphone_revoked", "fullscreen_entered", "fullscreen_exited", "tab_hidden", "tab_visible", "technical_error"]) })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "student") throw new TRPCError({ code: "FORBIDDEN", message: "Solo estudiantes pueden registrar eventos de su intento." }); const result = await db.addExamProctoringEvent({ ...input, institutionId: ctx.institutionId ?? 1, studentId: ctx.user.id }); if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Intento no disponible." }); return result; }),
  }),
  lms: router({
    listContents: protectedProcedure.input(z.object({ subjectId: z.number().int().positive().optional() }).optional()).query(({ ctx, input }) => db.listLmsContents(ctx.institutionId ?? 1, input?.subjectId, ctx.user.role === "student" ? ctx.user.id : undefined)),
    createContent: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), moduleId: z.number().int().positive().nullable().optional(), title: z.string().trim().min(2).max(220), contentType: z.enum(["reading", "video", "link", "file", "task"]), body: z.string().trim().max(20000).nullable().optional(), url: z.string().url().max(1024).nullable().optional() })).mutation(async ({ ctx, input }) => { assertInstitutionAdmin(ctx.user); const result = await db.createLmsContent({ ...input, institutionId: ctx.institutionId ?? 1, createdBy: ctx.user.id }); if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "La materia no pertenece a la institución activa." }); return result; }),
    complete: protectedProcedure.input(z.object({ contentId: z.number().int().positive(), completed: z.boolean() })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "student") throw new TRPCError({ code: "FORBIDDEN", message: "Solo estudiantes pueden actualizar su progreso." }); const result = await db.markLmsContentComplete({ ...input, institutionId: ctx.institutionId ?? 1, studentId: ctx.user.id }); if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Contenido no disponible." }); return result; }),
  }),
  finance: router({
    charges: protectedProcedure.query(async ({ ctx }) => { assertInstitutionAdmin(ctx.user); return db.listFinancialCharges(ctx.institutionId ?? 1); }),
    createCharge: protectedProcedure.input(z.object({ studentId: z.number().int().positive(), concept: z.string().trim().min(2).max(180), amountCents: z.number().int().positive(), dueAt: z.coerce.date() })).mutation(async ({ ctx, input }) => { assertInstitutionAdmin(ctx.user); const result = await db.createFinancialCharge({ ...input, institutionId: ctx.institutionId ?? 1, createdBy: ctx.user.id }); if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "El estudiante no pertenece a la institución activa." }); return result; }),
    payments: protectedProcedure.query(async ({ ctx }) => { assertInstitutionAdmin(ctx.user); return db.listFinancialPayments(ctx.institutionId ?? 1); }),
    createPayment: protectedProcedure.input(z.object({ studentId: z.number().int().positive(), chargeId: z.number().int().positive().nullable().optional(), amountCents: z.number().int().positive(), paymentMethod: z.string().trim().min(2).max(80), reference: z.string().trim().max(120).nullable().optional() })).mutation(async ({ ctx, input }) => { assertInstitutionAdmin(ctx.user); const result = await db.createFinancialPayment({ ...input, institutionId: ctx.institutionId ?? 1, receivedBy: ctx.user.id }); if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "El estudiante no pertenece a la institución activa." }); return result; }),
    expenses: protectedProcedure.query(async ({ ctx }) => { assertInstitutionAdmin(ctx.user); return db.listFinancialExpenses(ctx.institutionId ?? 1); }),
    createExpense: protectedProcedure.input(z.object({ concept: z.string().trim().min(2).max(180), amountCents: z.number().int().positive(), category: z.string().trim().min(2).max(100), incurredAt: z.coerce.date() })).mutation(async ({ ctx, input }) => { assertInstitutionAdmin(ctx.user); return db.createFinancialExpense({ ...input, institutionId: ctx.institutionId ?? 1, createdBy: ctx.user.id }); }),
  }),
  academicManagement: router({
    schedules: protectedProcedure.query(async ({ ctx }) => { assertInstitutionAdmin(ctx.user); return db.listClassSchedules(ctx.institutionId ?? 1); }),
    createSchedule: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), periodId: z.number().int().positive(), teacherId: z.number().int().positive().nullable().optional(), weekday: z.number().int().min(1).max(7), startsAt: z.string().regex(/^\\d{2}:\\d{2}$/), endsAt: z.string().regex(/^\\d{2}:\\d{2}$/), classroom: z.string().trim().max(120).nullable().optional(), modality: z.enum(["onsite", "virtual", "hybrid"]) })).mutation(async ({ ctx, input }) => { assertInstitutionAdmin(ctx.user); const result = await db.createClassSchedule({ ...input, institutionId: ctx.institutionId ?? 1 }); if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "La materia no pertenece a la institución activa." }); return result; }),
    studyPlans: protectedProcedure.query(async ({ ctx }) => { assertInstitutionAdmin(ctx.user); return db.listStudyPlans(ctx.institutionId ?? 1); }),
    createStudyPlan: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(180), version: z.string().trim().min(1).max(40), description: z.string().trim().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => { assertInstitutionAdmin(ctx.user); return db.createStudyPlan({ ...input, institutionId: ctx.institutionId ?? 1, createdBy: ctx.user.id }); }),
    issueCertificate: protectedProcedure.input(z.object({ studentId: z.number().int().positive(), certificateType: z.string().trim().min(2).max(120), certificateNumber: z.string().trim().min(2).max(100) })).mutation(async ({ ctx, input }) => { assertInstitutionAdmin(ctx.user); const result = await db.issueCertificate({ ...input, institutionId: ctx.institutionId ?? 1, issuedBy: ctx.user.id, verificationToken: crypto.randomUUID().replaceAll("-", "") }); if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "El estudiante no pertenece a la institución activa." }); return result; }),
  }),
  certificateVerification: router({ verify: publicProcedure.input(z.object({ token: z.string().trim().min(16).max(128) })).query(({ input }) => db.verifyCertificate(input.token)) }),
  admissions: router({
    listApplications: protectedProcedure.query(async ({ ctx }) => {
      assertInstitutionAdmin(ctx.user);
      return db.listAdmissionApplications(ctx.institutionId ?? 1);
    }),
    myApplications: protectedProcedure.query(({ ctx }) => db.listMyAdmissionApplications(ctx.institutionId ?? 1, ctx.user.id)),
    createApplication: protectedProcedure.input(z.object({ prospectId: z.number().int().positive().nullable().optional(), programName: z.string().trim().min(2).max(180) })).mutation(async ({ ctx, input }) => {
      const institutionId = ctx.institutionId ?? 1;
      const result = await db.createAdmissionApplication({ ...input, institutionId, applicantUserId: ctx.user.id });
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "El prospecto no pertenece a la institución activa." });
      return result;
    }),
    updateApplication: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["draft", "submitted", "under_review", "approved", "rejected", "enrolled"]), reviewNotes: z.string().trim().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => {
      assertInstitutionAdmin(ctx.user);
      const result = await db.updateAdmissionApplication({ ...input, institutionId: ctx.institutionId ?? 1, reviewedBy: ctx.user.id });
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud de admisión no encontrada." });
      return result;
    }),
    listDocuments: protectedProcedure.input(z.object({ applicationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const application = await db.getAdmissionApplication(input.applicationId, ctx.institutionId ?? 1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud de admisión no encontrada." });
      if (ctx.user.role !== "admin" && application.applicantUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "No puedes consultar esta solicitud." });
      return db.listAdmissionDocuments(input.applicationId, ctx.institutionId ?? 1);
    }),
    uploadDocument: protectedProcedure.input(z.object({ applicationId: z.number().int().positive(), documentType: z.string().trim().min(2).max(100), fileName: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(3).max(120), base64: z.string().max(12_000_000) })).mutation(async ({ ctx, input }) => {
      const application = await db.getAdmissionApplication(input.applicationId, ctx.institutionId ?? 1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud de admisión no encontrada." });
      if (ctx.user.role !== "admin" && application.applicantUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "No puedes adjuntar documentos a esta solicitud." });
      if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(input.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Solo se aceptan PDF, JPG, PNG o WEBP." });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
      const uploaded = await storagePut(`institutions/${ctx.institutionId ?? 1}/admissions/${input.applicationId}/${Date.now()}-${safeName}`, Buffer.from(input.base64, "base64"), input.mimeType);
      const result = await db.addAdmissionDocument({ institutionId: ctx.institutionId ?? 1, applicationId: input.applicationId, documentType: input.documentType, originalName: input.fileName, fileKey: uploaded.key, fileUrl: uploaded.url });
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud de admisión no encontrada." });
      return result;
    }),
    reviewDocument: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "accepted", "rejected"]), rejectionReason: z.string().trim().max(1000).nullable().optional() })).mutation(async ({ ctx, input }) => {
      assertInstitutionAdmin(ctx.user);
      const result = await db.reviewAdmissionDocument({ ...input, institutionId: ctx.institutionId ?? 1, reviewedBy: ctx.user.id });
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Documento no encontrado." });
      return result;
    }),
    createPreEnrollment: protectedProcedure.input(z.object({ applicationId: z.number().int().positive(), period: z.string().trim().min(2).max(60) })).mutation(async ({ ctx, input }) => {
      const application = await db.getAdmissionApplication(input.applicationId, ctx.institutionId ?? 1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud de admisión no encontrada." });
      if (ctx.user.role !== "admin" && application.applicantUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "No puedes crear esta prematrícula." });
      return db.createPreEnrollmentRequest({ ...input, institutionId: ctx.institutionId ?? 1 });
    }),
    listPreEnrollments: protectedProcedure.query(async ({ ctx }) => { assertInstitutionAdmin(ctx.user); return db.listPreEnrollmentRequests(ctx.institutionId ?? 1); }),
  }),
  notifications: router({
    list: protectedProcedure.query(({ ctx }) => db.listNotificationsForUser(ctx.user.id, ctx.institutionId ?? 1)),
    unreadCount: protectedProcedure.query(({ ctx }) => db.countUnreadNotifications(ctx.user.id, ctx.institutionId ?? 1)),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await db.markNotificationRead(ctx.user.id, input.id, ctx.institutionId ?? 1); return { success: true }; }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => { await db.markAllNotificationsRead(ctx.user.id, ctx.institutionId ?? 1); return { success: true }; }),
    preferences: protectedProcedure.query(({ ctx }) => db.getNotificationPreferences(ctx.user.id, ctx.institutionId ?? 1)),
    updatePreferences: protectedProcedure.input(z.object({ academicEnabled: z.boolean(), assessmentEnabled: z.boolean(), liveClassEnabled: z.boolean(), messageEnabled: z.boolean() })).mutation(async ({ ctx, input }) => { await db.updateNotificationPreferences(ctx.user.id, { academicEnabled: input.academicEnabled ? 1 : 0, assessmentEnabled: input.assessmentEnabled ? 1 : 0, liveClassEnabled: input.liveClassEnabled ? 1 : 0, messageEnabled: input.messageEnabled ? 1 : 0, institutionId: ctx.institutionId ?? 1 }); return { success: true }; }),
    create: protectedProcedure.input(z.object({ userId: z.number().int().positive(), type: z.enum(["academic", "assessment", "live_class", "message", "system"]), title: z.string().trim().min(2).max(220), message: z.string().trim().min(2), href: z.string().max(512).nullable().optional() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Solo administración puede crear notificaciones." });
      return { id: await db.createNotification({ ...input, institutionId: ctx.institutionId ?? 1 }) };
    }),
  }),
  academic: academicRouter,
});

export type AppRouter = typeof appRouter;
