import { TRPCError } from "@trpc/server";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import * as db from "../db";
import { storagePut } from "../storage";
import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
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
      { title: `Guía introductoria de ${input.topic}`, description: "Material de lectura para orientar el aprendizaje.", resourceType: "reading" as const, url: null },
      { title: "Actividad práctica guiada", description: "Recurso para aplicar los conceptos principales.", resourceType: "document" as const, url: null },
    ],
    competencies: [
      { title: `Comprender fundamentos de ${input.topic}`, description: "Reconoce conceptos, vocabulario y aplicaciones esenciales.", level: "basic" as const },
      { title: `Aplicar conocimientos de ${input.topic}`, description: "Resuelve situaciones prácticas y argumenta decisiones.", level: input.level as "basic" | "intermediate" | "advanced" },
    ],
    modules: ["Fundamentos", "Aplicación", "Proyecto integrador"].map((phase, index) => ({
      title: `Módulo ${index + 1} · ${phase} de ${input.topic}`,
      overview: `Este módulo desarrolla ${phase.toLowerCase()} de ${input.topic} mediante explicaciones, ejemplos, análisis guiado y una actividad de clase.`,
      learningObjectives: ["Reconocer conceptos esenciales", "Aplicar lo aprendido en una situación académica"],
      estimatedHours: index === 1 ? 4 : 3,
      imagePrompt: `Ilustración editorial educativa sobre ${phase.toLowerCase()} de ${input.topic}, entorno académico contemporáneo, paleta carbón, piedra y dorado, sin texto`,
      lessons: [
        { title: `Conceptos de ${phase.toLowerCase()}`, summary: `Presentación clara de los conceptos y procedimientos que componen ${phase.toLowerCase()} de ${input.topic}.`, explanation: `La clase propone una explicación paso a paso que conecta los conceptos con casos cercanos. El docente modela cómo usar el vocabulario del área, formula preguntas de análisis y acompaña a los estudiantes para que relacionen la teoría con decisiones y situaciones concretas.`, keyTopics: ["Conceptos centrales", "Vocabulario académico", "Ejemplos aplicados"], classActivity: "Discusión guiada con un caso breve y registro de ideas principales." },
        { title: `Taller de ${phase.toLowerCase()}`, summary: "Aplicación guiada de los contenidos mediante una actividad práctica y colaborativa.", explanation: `Los estudiantes organizan la información disponible, seleccionan una estrategia de resolución y argumentan su propuesta. La actividad permite identificar avances, dudas y oportunidades de mejora antes de continuar con el siguiente módulo.`, keyTopics: ["Análisis de casos", "Resolución de problemas", "Argumentación"], classActivity: "Taller por equipos con socialización de resultados y retroalimentación." },
      ],
    })),
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

async function assertSubjectManager(user: AppUser, subjectId: number, institutionId = 1) {
  if (isAdministrator(user)) return;
  const subject = await db.getSubjectById(subjectId, institutionId);
  if (!subject || !isTeacher(user) || subject.teacherId !== user.id) forbid("Solo el docente asignado puede administrar esta materia.");
}

async function ownStudent(user: AppUser, institutionId = 1) {
  const student = await db.getStudentForUser(user.id, user.email, institutionId);
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
  profilePhotoUrl: z.string().url().max(1024).nullable().optional(),
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

const courseModuleInput = z.object({
  title: z.string().trim().min(3).max(220),
  overview: z.string().trim().min(30).max(5000),
  learningObjectives: z.array(z.string().trim().min(3).max(500)).min(2).max(5),
  estimatedHours: z.number().int().min(1).max(24),
  imagePrompt: z.string().trim().min(10).max(1000),
  lessons: z.array(z.object({
    title: z.string().trim().min(3).max(220),
    summary: z.string().trim().min(20).max(1500),
    explanation: z.string().trim().min(80).max(5000),
    keyTopics: z.array(z.string().trim().min(2).max(250)).min(3).max(6),
    classActivity: z.string().trim().min(10).max(1500).nullable().optional(),
  })).min(2).max(4),
});

const generatedCourseInput = z.object({ topic: z.string().trim().min(3).max(180), level: z.enum(["basic", "intermediate", "advanced"]), period: z.string().trim().min(2).max(60) });
const detailedCourseProposal = z.object({
  code: z.string().trim().min(2).max(32),
  name: z.string().trim().min(3).max(180),
  description: z.string().trim().min(30).max(5000),
  resources: z.array(resourceInput).min(2).max(4),
  competencies: z.array(competencyInput).min(2).max(5),
  modules: z.array(courseModuleInput).min(3).max(3),
});

const assessmentQuestionInput = z.object({
  id: z.string().trim().min(1).max(60),
  prompt: z.string().trim().min(12).max(1500),
  options: z.array(z.string().trim().min(1).max(500)).length(4),
  correctOption: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(20).max(1500),
});

const generatedAssessment = z.object({
  title: z.string().trim().min(4).max(220),
  description: z.string().trim().min(25).max(2000),
  passingScore: z.number().int().min(50).max(100),
  questions: z.array(assessmentQuestionInput).min(5).max(8),
});

function fallbackAssessment(module: { title: string; overview: string }) {
  return {
    title: `Evaluación de cierre · ${module.title}`,
    description: `Cuestionario de cierre para comprobar la comprensión de los contenidos trabajados en ${module.title}.`,
    passingScore: 70,
    questions: [1, 2, 3, 4, 5].map(index => ({
      id: `q${index}`,
      prompt: `¿Cuál afirmación representa mejor un aprendizaje central del módulo ${module.title}?`,
      options: ["Relacionar conceptos con situaciones reales", "Memorizar términos sin aplicarlos", "Evitar el análisis de casos", "Trabajar sin criterios de revisión"],
      correctOption: 0,
      explanation: `El módulo busca que los estudiantes comprendan y apliquen sus contenidos en contextos y situaciones reales.`,
    })),
  };
}

async function generateModuleAssessment(module: { title: string; overview: string; learningObjectives: string[]; lessons: Array<{ title: string; summary: string; keyTopics: string[] }> }) {
  try {
    const lessonContext = module.lessons.map(lesson => `Clase: ${lesson.title}. Resumen: ${lesson.summary}. Temas: ${lesson.keyTopics.join(", ")}.`).join("\n");
    const response = await invokeLLM({
      model: "claude-haiku-4-5",
      maxTokens: 4000,
      messages: [
        { role: "system", content: "Eres un docente experto en evaluación formativa. Responde únicamente JSON válido, en español, sin Markdown." },
        { role: "user", content: `Crea una evaluación de cierre del módulo "${module.title}". Contexto: ${module.overview}. Objetivos: ${module.learningObjectives.join("; ")}. Contenidos:\n${lessonContext}\nDevuelve JSON con title, description, passingScore (70), y questions. Incluye exactamente 5 preguntas de opción múltiple con id, prompt, options (exactamente 4), correctOption (índice 0 a 3) y explanation. Evalúa comprensión y aplicación; evita preguntas ambiguas, trampas y contenido ajeno al módulo.` },
      ],
    });
    const content = response.choices?.[0]?.message.content;
    if (typeof content !== "string") return fallbackAssessment(module);
    const parsed = generatedAssessment.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : fallbackAssessment(module);
  } catch {
    return fallbackAssessment(module);
  }
}

async function generateDetailedCourseProposal(input: z.infer<typeof generatedCourseInput>) {
  const response = await invokeLLM({
    model: "claude-haiku-4-5",
    maxTokens: 6000,
    messages: [
      { role: "system", content: "Eres un diseñador curricular experto. Responde únicamente JSON válido, en español, sin Markdown y sin enlaces inventados." },
      { role: "user", content: `Diseña una materia completa sobre ${input.topic}, nivel ${input.level}, período ${input.period}. Incluye code, name, description, resources (2 a 4, con title, description, resourceType y url null si no hay una URL verificable), competencies (2 a 5 con title, description y level), y exactamente 3 modules. Cada módulo debe incluir title, overview muy claro, 2 a 5 learningObjectives, estimatedHours, imagePrompt en español para una ilustración educativa sin texto, y 2 a 4 lessons. Cada lección requiere title, summary, explanation didáctica detallada de mínimo 80 caracteres, 3 a 6 keyTopics y classActivity. Mantén una progresión: fundamentos, aplicación y proyecto integrador.` },
    ],
  });
  const content = response.choices?.[0]?.message.content;
  if (typeof content !== "string") return fallbackCourseProposal(input);
  try {
    const parsed = detailedCourseProposal.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : fallbackCourseProposal(input);
  } catch {
    return fallbackCourseProposal(input);
  }
}

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

const liveClassInput = z.object({
  subjectId: z.number().int().positive(),
  title: z.string().trim().min(3).max(220),
  description: z.string().trim().max(5000).nullable().optional(),
  meetUrl: z.string().url().regex(/^https:\/\/meet\.google\.com\/[a-z0-9-]+/i, "Ingresa un enlace válido de Google Meet."),
  startsAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(480).default(60),
  status: z.enum(["draft", "published", "completed", "cancelled"]).default("draft"),
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
  profile: router({
    me: protectedProcedure.query(({ ctx }) => db.getProfileForUser(ctx.user.id, ctx.institutionId ?? 1)),
    uploadPhoto: protectedProcedure.input(fileInput).mutation(async ({ ctx, input }) => {
      if (!input.mimeType.startsWith("image/")) throw new TRPCError({ code: "BAD_REQUEST", message: "La foto debe ser una imagen." });
      const uploaded = await uploadAttachment(ctx.user.id, input, "profiles");
      return db.updateProfile(ctx.user.id, ctx.institutionId ?? 1, { profilePhotoUrl: uploaded.resourceFileUrl });
    }),
    update: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(180), phone: z.string().trim().max(32).nullable().optional(), bio: z.string().trim().max(2000).nullable().optional(), profilePhotoUrl: z.string().url().max(1024).nullable().optional() })).mutation(async ({ ctx, input }) => {
      const profile = await db.updateProfile(ctx.user.id, ctx.institutionId ?? 1, input);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Perfil no disponible en la institución activa." });
      return profile;
    }),
  }),
  dashboard: protectedProcedure.query(async ({ ctx }) => db.getDashboardStats({ ...ctx.user, role: roleForAccess(ctx.user.role), institutionId: ctx.institutionId ?? 1 })),

  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      assertAdmin(ctx.user);
      return db.listUsers(ctx.institutionId ?? 1);
    }),
    setRole: protectedProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["admin", "teacher", "student"]) })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      if (!(await db.getUserByIdInInstitution(input.userId, ctx.institutionId ?? 1))) forbid("El usuario no pertenece a esta institución.");
      await db.updateUserRole(input.userId, input.role);
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes eliminar tu propia cuenta mientras tienes la sesión abierta." });
      const account = await db.getUserByIdInInstitution(input.userId, ctx.institutionId ?? 1);
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado." });
      if (account.role === "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Las cuentas administradoras están protegidas y no se pueden eliminar desde el portal." });
      await db.deleteUserAccount(input.userId);
      return { success: true };
    }),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(180), email: z.string().trim().email().max(320), password: z.string().min(8).max(128), role: z.enum(["teacher", "student"]) })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      if (await db.getUserByEmail(input.email)) throw new TRPCError({ code: "CONFLICT", message: "Ya existe una cuenta con este correo." });
      const user = await db.createLocalUser({ name: input.name, email: input.email.toLowerCase(), passwordHash: await hashAccountPassword(input.password), role: input.role, institutionId: ctx.institutionId ?? 1 });
      return { id: user?.id };
    }),
  }),

  students: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (isAdministrator(ctx.user)) return db.listStudents(ctx.institutionId ?? 1);
      if (isTeacher(ctx.user)) return db.listStudentsForTeacher(ctx.user.id, ctx.institutionId ?? 1);
      return [await db.getStudentForUser(ctx.user.id, ctx.user.email, ctx.institutionId ?? 1)];
    }),
    create: protectedProcedure.input(studentInput).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      return { id: await db.createStudent({ ...input, institutionId: ctx.institutionId ?? 1 }) };
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: studentInput })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      await db.updateStudent(input.id, ctx.institutionId ?? 1, input.data);
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      await db.deleteStudent(input.id, ctx.institutionId ?? 1);
      return { success: true };
    }),
  }),

  subjects: router({
    list: protectedProcedure.query(async ({ ctx }) => db.listSubjectsForUser({ ...ctx.user, role: roleForAccess(ctx.user.role), institutionId: ctx.institutionId ?? 1 })),
    create: protectedProcedure.input(subjectCreateInput).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      const { studentIds, resources, competencies, ...subject } = input;
      return { id: await db.createSubjectWithCurriculum({ ...subject, studentIds, resources, competencies, createdBy: ctx.user.id, institutionId: ctx.institutionId ?? 1 }) };
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: subjectInput.extend({ active: z.boolean() }) })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      if (!(await db.getSubjectById(input.id, ctx.institutionId ?? 1))) throw new TRPCError({ code: "NOT_FOUND", message: "Materia no encontrada." });
      await db.updateSubject(input.id, ctx.institutionId ?? 1, input.data);
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      if (!(await db.getSubjectById(input.id, ctx.institutionId ?? 1))) throw new TRPCError({ code: "NOT_FOUND", message: "Materia no encontrada." });
      await db.deleteSubject(input.id, ctx.institutionId ?? 1);
      return { success: true };
    }),
    enroll: protectedProcedure.input(z.object({ studentId: z.number().int().positive(), subjectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      await db.enrollStudent(input.studentId, input.subjectId, ctx.institutionId ?? 1);
      return { success: true };
    }),
    unenroll: protectedProcedure.input(z.object({ studentId: z.number().int().positive(), subjectId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      await db.removeEnrollment(input.studentId, input.subjectId, ctx.institutionId ?? 1);
      return { success: true };
    }),
    enrollments: protectedProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      return db.listEnrollmentsForSubject(input.subjectId, ctx.institutionId ?? 1);
    }),
  }),

  activities: router({
    list: protectedProcedure.query(async ({ ctx }) => db.listActivitiesForUser({ ...ctx.user, role: roleForAccess(ctx.user.role), institutionId: ctx.institutionId ?? 1 })),
    create: protectedProcedure.input(activityInput).mutation(async ({ ctx, input }) => {
      await assertSubjectManager(ctx.user, input.subjectId, ctx.institutionId ?? 1);
      const attachment = await uploadAttachment(ctx.user.id, input.attachment);
      return { id: await db.createActivity({ ...input, ...attachment, createdBy: ctx.user.id, institutionId: ctx.institutionId ?? 1, dueAt: input.dueAt ? new Date(input.dueAt) : null }) };
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: activityInput.omit({ subjectId: true }) })).mutation(async ({ ctx, input }) => {
      const activity = await db.getActivityById(input.id, ctx.institutionId ?? 1);
      if (!activity) throw new TRPCError({ code: "NOT_FOUND", message: "Actividad no encontrada." });
      await assertSubjectManager(ctx.user, activity.subjectId, ctx.institutionId ?? 1);
      const attachment = await uploadAttachment(ctx.user.id, input.data.attachment);
      await db.updateActivity(input.id, { ...input.data, ...attachment, dueAt: input.data.dueAt ? new Date(input.data.dueAt) : null });
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const activity = await db.getActivityById(input.id, ctx.institutionId ?? 1);
      if (!activity) throw new TRPCError({ code: "NOT_FOUND", message: "Actividad no encontrada." });
      await assertSubjectManager(ctx.user, activity.subjectId, ctx.institutionId ?? 1);
      await db.deleteActivity(input.id);
      return { success: true };
    }),
  }),

  liveClasses: router({
    list: protectedProcedure.query(async ({ ctx }) => db.listLiveClassesForUser({ ...ctx.user, role: roleForAccess(ctx.user.role), institutionId: ctx.institutionId ?? 1 })),
    create: protectedProcedure.input(liveClassInput).mutation(async ({ ctx, input }) => {
      await assertSubjectManager(ctx.user, input.subjectId, ctx.institutionId ?? 1);
      return { id: await db.createLiveClass({ ...input, startsAt: new Date(input.startsAt), createdBy: ctx.user.id, institutionId: ctx.institutionId ?? 1 }) };
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: liveClassInput.omit({ subjectId: true }) })).mutation(async ({ ctx, input }) => {
      const liveClass = await db.getLiveClassById(input.id, ctx.institutionId ?? 1);
      if (!liveClass) throw new TRPCError({ code: "NOT_FOUND", message: "Clase en vivo no encontrada." });
      await assertSubjectManager(ctx.user, liveClass.subjectId, ctx.institutionId ?? 1);
      await db.updateLiveClass(input.id, { ...input.data, startsAt: new Date(input.data.startsAt) });
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const liveClass = await db.getLiveClassById(input.id, ctx.institutionId ?? 1);
      if (!liveClass) throw new TRPCError({ code: "NOT_FOUND", message: "Clase en vivo no encontrada." });
      await assertSubjectManager(ctx.user, liveClass.subjectId, ctx.institutionId ?? 1);
      await db.deleteLiveClass(input.id, ctx.institutionId ?? 1);
      return { success: true };
    }),
  }),

  grades: router({
    list: protectedProcedure.query(async ({ ctx }) => db.listGradesForUser({ ...ctx.user, role: roleForAccess(ctx.user.role), institutionId: ctx.institutionId ?? 1 })),
    create: protectedProcedure.input(z.object({ studentId: z.number().int().positive(), subjectId: z.number().int().positive(), period: z.string().trim().min(1).max(60), title: z.string().trim().min(2).max(220), score: z.number().int().min(0).max(1000), maxScore: z.number().int().min(1).max(1000).default(100), notes: z.string().trim().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => {
      if (!isStaff(ctx.user)) forbid();
      await assertSubjectManager(ctx.user, input.subjectId, ctx.institutionId ?? 1);
      if (!(await db.isStudentEnrolled(input.studentId, input.subjectId, ctx.institutionId ?? 1))) throw new TRPCError({ code: "BAD_REQUEST", message: "El estudiante no está inscrito en esta materia." });
      return { id: await db.createGrade({ ...input, gradedBy: ctx.user.id, institutionId: ctx.institutionId ?? 1 }) };
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: z.object({ period: z.string().trim().min(1).max(60), title: z.string().trim().min(2).max(220), score: z.number().int().min(0).max(1000), maxScore: z.number().int().min(1).max(1000), notes: z.string().trim().max(5000).nullable().optional() }) })).mutation(async ({ ctx, input }) => {
      const grade = await db.getGradeById(input.id, ctx.institutionId ?? 1);
      if (!grade) throw new TRPCError({ code: "NOT_FOUND", message: "Nota no encontrada." });
      await assertSubjectManager(ctx.user, grade.subjectId, ctx.institutionId ?? 1);
      await db.updateGrade(input.id, input.data);
      return { success: true };
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const grade = await db.getGradeById(input.id, ctx.institutionId ?? 1);
      if (!grade) throw new TRPCError({ code: "NOT_FOUND", message: "Nota no encontrada." });
      await assertSubjectManager(ctx.user, grade.subjectId, ctx.institutionId ?? 1);
      await db.deleteGrade(input.id);
      return { success: true };
    }),
  }),

  submissions: router({
    list: protectedProcedure.query(async ({ ctx }) => db.listSubmissionsForUser({ ...ctx.user, role: roleForAccess(ctx.user.role), institutionId: ctx.institutionId ?? 1 })),
    submit: protectedProcedure.input(z.object({ activityId: z.number().int().positive(), content: z.string().trim().max(5000).nullable().optional(), attachment: fileInput.nullable().optional() })).mutation(async ({ ctx, input }) => {
      if (isStaff(ctx.user)) forbid("Solo los estudiantes pueden entregar actividades.");
      const student = await ownStudent(ctx.user, ctx.institutionId ?? 1);
      const activity = await db.getActivityById(input.activityId, ctx.institutionId ?? 1);
      if (!activity || activity.status !== "published") throw new TRPCError({ code: "NOT_FOUND", message: "La actividad no está disponible para entregar." });
      if (!(await db.isStudentEnrolled(student.id, activity.subjectId, ctx.institutionId ?? 1))) forbid("No estás inscrito en la materia de esta actividad.");
      const uploaded = await uploadAttachment(ctx.user.id, input.attachment, "submissions");
      await db.createSubmission({ activityId: input.activityId, studentId: student.id, institutionId: ctx.institutionId ?? 1, content: input.content, fileKey: uploaded.resourceFileKey, fileUrl: uploaded.resourceFileUrl });
      return { success: true };
    }),
    grade: protectedProcedure.input(z.object({ id: z.number().int().positive(), score: z.number().int().min(0).max(1000), feedback: z.string().trim().max(5000).nullable().optional() })).mutation(async ({ ctx, input }) => {
      const submission = await db.getSubmissionById(input.id, ctx.institutionId ?? 1);
      if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Entrega no encontrada." });
      await assertSubjectManager(ctx.user, submission.subjectId, ctx.institutionId ?? 1);
      await db.gradeSubmission(input.id, { score: input.score, feedback: input.feedback, gradedBy: ctx.user.id });
      return { success: true };
    }),
  }),
  curriculum: router({
    resources: protectedProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      if (!(await db.canAccessSubject({ ...ctx.user, role: roleForAccess(ctx.user.role), institutionId: ctx.institutionId ?? 1 }, input.subjectId))) forbid("No tienes acceso a los recursos de esta materia.");
      return db.listCourseResources(input.subjectId, ctx.institutionId ?? 1);
    }),
    competencies: protectedProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      if (!(await db.canAccessSubject({ ...ctx.user, role: roleForAccess(ctx.user.role), institutionId: ctx.institutionId ?? 1 }, input.subjectId))) forbid("No tienes acceso a las competencias de esta materia.");
      return db.listCompetencies(input.subjectId, ctx.institutionId ?? 1);
    }),
    modules: protectedProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      if (!(await db.canAccessSubject({ ...ctx.user, role: roleForAccess(ctx.user.role), institutionId: ctx.institutionId ?? 1 }, input.subjectId))) forbid("No tienes acceso al programa de esta materia.");
      return db.listCourseModulesForSubject(input.subjectId, ctx.institutionId ?? 1);
    }),
    assessments: protectedProcedure.input(z.object({ moduleId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const courseModule = await db.getCourseModuleById(input.moduleId, ctx.institutionId ?? 1);
      if (!courseModule) throw new TRPCError({ code: "NOT_FOUND", message: "Módulo no encontrado." });
      if (!(await db.canAccessSubject({ ...ctx.user, role: roleForAccess(ctx.user.role), institutionId: ctx.institutionId ?? 1 }, courseModule.subjectId))) forbid("No tienes acceso a las evaluaciones de este módulo.");
      const assessments = await db.listModuleAssessments(input.moduleId, isStaff(ctx.user), ctx.institutionId ?? 1);
      return isStaff(ctx.user) ? assessments : assessments.filter(assessment => assessment.status === "published");
    }),
    generateAssessment: protectedProcedure.input(z.object({ moduleId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const courseModule = await db.getCourseModuleById(input.moduleId, ctx.institutionId ?? 1);
      if (!courseModule) throw new TRPCError({ code: "NOT_FOUND", message: "Módulo no encontrado." });
      await assertSubjectManager(ctx.user, courseModule.subjectId, ctx.institutionId ?? 1);
      const modules = await db.listCourseModulesForSubject(courseModule.subjectId, ctx.institutionId ?? 1);
      const moduleDetail = modules.find(item => item.id === input.moduleId);
      if (!moduleDetail) throw new TRPCError({ code: "NOT_FOUND", message: "No fue posible obtener los contenidos del módulo." });
      const proposal = await generateModuleAssessment(moduleDetail);
      return { id: await db.createModuleAssessment({ ...proposal, moduleId: input.moduleId, status: "published", createdBy: ctx.user.id }) };
    }),
    submitAssessment: protectedProcedure.input(z.object({ assessmentId: z.number().int().positive(), answers: z.array(z.object({ questionId: z.string().trim().min(1).max(60), selectedOption: z.number().int().min(0).max(3) })).min(1).max(8) })).mutation(async ({ ctx, input }) => {
      if (isStaff(ctx.user)) forbid("Solo los estudiantes pueden resolver evaluaciones.");
      const student = await ownStudent(ctx.user, ctx.institutionId ?? 1);
      const assessment = await db.getModuleAssessmentById(input.assessmentId, ctx.institutionId ?? 1);
      if (!assessment || assessment.status !== "published") throw new TRPCError({ code: "NOT_FOUND", message: "La evaluación no está disponible." });
      const courseModule = await db.getCourseModuleById(assessment.moduleId, ctx.institutionId ?? 1);
      if (!courseModule || !(await db.isStudentEnrolled(student.id, courseModule.subjectId, ctx.institutionId ?? 1))) forbid("No estás inscrito en la materia de esta evaluación.");
      const answerMap = new Map(input.answers.map(answer => [answer.questionId, answer.selectedOption]));
      const score = assessment.questions.reduce((total, question) => total + (answerMap.get(question.id) === question.correctOption ? 1 : 0), 0);
      const maxScore = assessment.questions.length;
      const percentage = Math.round((score / maxScore) * 100);
      const passed = percentage >= assessment.passingScore;
      const id = await db.createModuleAssessmentAttempt({ assessmentId: assessment.id, studentId: student.id, answers: input.answers, score, maxScore, passed });
      return { id, score, maxScore, percentage, passed, passingScore: assessment.passingScore, review: assessment.questions.map(question => ({ questionId: question.id, correctOption: question.correctOption, explanation: question.explanation })) };
    }),
    progress: protectedProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      if (!(await db.canAccessSubject({ ...ctx.user, role: roleForAccess(ctx.user.role), institutionId: ctx.institutionId ?? 1 }, input.subjectId))) forbid("No tienes acceso al progreso de esta materia.");
      if (isStaff(ctx.user)) return { isStudent: false, completedLessonIds: [], completedModuleIds: [], passedAssessmentIds: [], totalLessons: 0, completedLessons: 0, percentage: 0 };
      const student = await ownStudent(ctx.user, ctx.institutionId ?? 1);
      const modules = await db.listCourseModulesForSubject(input.subjectId, ctx.institutionId ?? 1);
      const completedLessonIds = (await db.listCompletedLessonsForStudent(student.id, input.subjectId, ctx.institutionId ?? 1)).map(item => item.lessonId);
      const assessmentLists = await Promise.all(modules.map(courseModule => db.listModuleAssessments(courseModule.id, false, ctx.institutionId ?? 1)));
      const assessments = assessmentLists.flat().filter(assessment => assessment.status === "published");
      const attempts = await db.listAssessmentAttemptsForStudent(student.id, assessments.map(assessment => assessment.id));
      const passedAssessmentIds = Array.from(new Set(attempts.filter(attempt => attempt.passed === 1).map(attempt => attempt.assessmentId)));
      const completedModuleIds = modules.filter(courseModule => courseModule.lessons.length > 0 && courseModule.lessons.every(lesson => completedLessonIds.includes(lesson.id))).map(courseModule => courseModule.id);
      const totalLessons = modules.reduce((total, courseModule) => total + courseModule.lessons.length, 0);
      return { isStudent: true, completedLessonIds, completedModuleIds, passedAssessmentIds, totalLessons, completedLessons: completedLessonIds.length, percentage: totalLessons ? Math.round((completedLessonIds.length / totalLessons) * 100) : 0 };
    }),
    setLessonProgress: protectedProcedure.input(z.object({ lessonId: z.number().int().positive(), completed: z.boolean() })).mutation(async ({ ctx, input }) => {
      if (isStaff(ctx.user)) forbid("Solo los estudiantes pueden actualizar su avance.");
      const student = await ownStudent(ctx.user, ctx.institutionId ?? 1);
      const lesson = await db.getCourseLessonById(input.lessonId, ctx.institutionId ?? 1);
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lección no encontrada." });
      const courseModule = await db.getCourseModuleById(lesson.moduleId, ctx.institutionId ?? 1);
      if (!courseModule || !(await db.isStudentEnrolled(student.id, courseModule.subjectId, ctx.institutionId ?? 1))) forbid("No estás inscrito en la materia de esta lección.");
      await db.setLessonCompletion({ ...input, studentId: student.id, institutionId: ctx.institutionId ?? 1 });
      return { success: true };
    }),
    addResource: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), data: resourceInput })).mutation(async ({ ctx, input }) => {
      await assertSubjectManager(ctx.user, input.subjectId, ctx.institutionId ?? 1);
      return { id: await db.createCourseResource({ ...input.data, subjectId: input.subjectId, createdBy: ctx.user.id, institutionId: ctx.institutionId ?? 1 }) };
    }),
    addCompetency: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), data: competencyInput })).mutation(async ({ ctx, input }) => {
      await assertSubjectManager(ctx.user, input.subjectId, ctx.institutionId ?? 1);
      return { id: await db.createCompetency({ ...input.data, subjectId: input.subjectId, institutionId: ctx.institutionId ?? 1 }) };
    }),
  }),
  messages: router({
    recipients: protectedProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      if (!(await db.canAccessSubject({ ...ctx.user, role: roleForAccess(ctx.user.role), institutionId: ctx.institutionId ?? 1 }, input.subjectId))) forbid();
      const subject = await db.getSubjectById(input.subjectId, ctx.institutionId ?? 1);
      const students = await db.listMessageRecipients(input.subjectId, ctx.institutionId ?? 1);
      const teacher = subject?.teacherId ? await db.getUserById(subject.teacherId) : undefined;
      return [...students, ...(teacher ? [{ id: teacher.id, name: teacher.name, email: teacher.email, role: teacher.role }] : [])].filter(person => person.id !== ctx.user.id);
    }),
    list: protectedProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      if (!(await db.canAccessSubject({ ...ctx.user, role: roleForAccess(ctx.user.role), institutionId: ctx.institutionId ?? 1 }, input.subjectId))) forbid();
      return db.listMessagesForUser(input.subjectId, ctx.user.id, ctx.institutionId ?? 1);
    }),
    send: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), recipientId: z.number().int().positive(), body: z.string().trim().min(1).max(5000) })).mutation(async ({ ctx, input }) => {
      if (!(await db.canAccessSubject({ ...ctx.user, role: roleForAccess(ctx.user.role), institutionId: ctx.institutionId ?? 1 }, input.subjectId))) forbid();
      const recipients = await db.listMessageRecipients(input.subjectId, ctx.institutionId ?? 1);
      const subject = await db.getSubjectById(input.subjectId, ctx.institutionId ?? 1);
      const recipientAllowed = recipients.some(person => person.id === input.recipientId) || subject?.teacherId === input.recipientId || isAdministrator(ctx.user);
      if (!recipientAllowed) forbid("La persona destinataria no pertenece a esta materia.");
      return { id: await db.createMessage({ ...input, senderId: ctx.user.id, institutionId: ctx.institutionId ?? 1 }) };
    }),
  }),
  ai: router({
    generateCourse: protectedProcedure.input(generatedCourseInput).mutation(async ({ ctx, input }) => {
      if (!isStaff(ctx.user)) forbid("Solo el personal académico puede generar propuestas de curso.");
      return generateDetailedCourseProposal(input);
    }),
    createGeneratedCourse: protectedProcedure.input(generatedCourseInput).mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.user);
      const proposal = await generateDetailedCourseProposal(input);
      const modules = await Promise.all(proposal.modules.map(async courseModule => {
        try {
          const image = await generateImage({ prompt: `${courseModule.imagePrompt}. Ilustración horizontal para una plataforma educativa institucional, composición limpia, no incluir palabras, letras, números ni marcas.` });
          const assessment = await generateModuleAssessment(courseModule);
          return { ...courseModule, imageUrl: image.url, assessment };
        } catch (error) {
          console.warn("[Curriculum] No fue posible generar la ilustración del módulo:", error);
          const assessment = await generateModuleAssessment(courseModule);
          return { ...courseModule, imageUrl: null, assessment };
        }
      }));
      const id = await db.createSubjectWithCurriculum({ ...proposal, modules, period: input.period, color: "#B69A5E", createdBy: ctx.user.id, institutionId: ctx.institutionId ?? 1 });
      return { id, proposal: { ...proposal, modules } };
    }),
  }),
});
