import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = {
  listUsers: vi.fn(async () => [{ id: 4, role: "teacher", name: "Docente" }]),
  updateUserRole: vi.fn(async () => undefined),
  getUserById: vi.fn(async (id: number) => ({ id, role: id === 1 ? "admin" : "teacher", name: "Cuenta" })),
  getUserByIdInInstitution: vi.fn(async (id: number, institutionId = 1) => institutionId === 2 ? undefined : ({ id, role: id === 1 ? "admin" : "teacher", name: "Cuenta" })),
  deleteUserAccount: vi.fn(async () => undefined),
  getUserByEmail: vi.fn(async () => undefined),
  createLocalUser: vi.fn(async () => ({ id: 19, name: "Cuenta", email: "cuenta@wijiedu.test", role: "teacher" })),
  createStudent: vi.fn(async () => 18),
  updateStudent: vi.fn(async () => undefined),
  deleteStudent: vi.fn(async () => undefined),
  createSubjectWithCurriculum: vi.fn(async () => 22),
  updateSubject: vi.fn(async () => undefined),
  deleteSubject: vi.fn(async () => undefined),
  enrollStudent: vi.fn(async () => undefined),
  removeEnrollment: vi.fn(async () => undefined),
  listEnrollmentsForSubject: vi.fn(async () => []),
  getSubjectById: vi.fn(async (_id: number, institutionId = 1) => institutionId === 2 ? undefined : ({ id: 7, teacherId: 2 })),
  getActivityById: vi.fn(async (_id: number, institutionId = 1) => institutionId === 2 ? undefined : ({ id: 11, subjectId: 7, status: "published" })),
  createActivity: vi.fn(async () => 27),
  updateActivity: vi.fn(async () => undefined),
  deleteActivity: vi.fn(async () => undefined),
  isStudentEnrolled: vi.fn(async () => true),
  getGradeById: vi.fn(async (_id: number, institutionId = 1) => institutionId === 2 ? undefined : ({ id: 31, subjectId: 7 })),
  createGrade: vi.fn(async () => 31),
  updateGrade: vi.fn(async () => undefined),
  deleteGrade: vi.fn(async () => undefined),
  getStudentForUser: vi.fn(async () => ({ id: 5, email: "student@wijiedu.test" })),
  createSubmission: vi.fn(async () => undefined),
  getSubmissionById: vi.fn(async (_id: number, institutionId = 1) => institutionId === 2 ? undefined : ({ id: 33, activityId: 11, studentId: 5, subjectId: 7 })),
  gradeSubmission: vi.fn(async () => undefined),
  canAccessSubject: vi.fn(async () => true),
  listMessageRecipients: vi.fn(async () => [{ id: 2, name: "Docente", email: "teacher@wijiedu.test", role: "teacher" }]),
  listMessagesForUser: vi.fn(async () => []),
  createMessage: vi.fn(async () => 44),
  listLiveClassesForUser: vi.fn(async () => [{ id: 61, subjectId: 7, title: "Tutoría", meetUrl: "https://meet.google.com/abc-defg-hij", startsAt: new Date(), durationMinutes: 60, status: "published" }]),
  createLiveClass: vi.fn(async () => 61),
  getLiveClassById: vi.fn(async (_id: number, institutionId = 1) => institutionId === 2 ? undefined : ({ id: 61, subjectId: 7, createdBy: 1 })),
  updateLiveClass: vi.fn(async () => undefined),
  deleteLiveClass: vi.fn(async () => undefined),
  listCourseModulesForSubject: vi.fn(async () => [{ id: 71, subjectId: 7, title: "Módulo de prueba", learningObjectives: ["Aplicar conceptos"], lessons: [{ id: 72, title: "Clase de prueba", keyTopics: ["Tema"] }] }]),
  getCourseModuleById: vi.fn(async () => ({ id: 71, subjectId: 7, title: "Módulo de prueba", overview: "Contenido de prueba" })),
  getCourseLessonById: vi.fn(async () => ({ id: 72, moduleId: 71 })),
  listModuleAssessments: vi.fn(async () => [{ id: 81, moduleId: 71, title: "Evaluación", description: "Comprueba conceptos.", questions: [{ id: "q1", prompt: "Pregunta", options: ["Correcta", "B", "C", "D"] }], passingScore: 70, status: "published" }]),
  getModuleAssessmentById: vi.fn(async () => ({ id: 81, moduleId: 71, title: "Evaluación", description: "Comprueba conceptos.", questions: [{ id: "q1", prompt: "Pregunta", options: ["Correcta", "B", "C", "D"], correctOption: 0, explanation: "La opción correcta aplica el concepto." }], passingScore: 70, status: "published" })),
  createModuleAssessment: vi.fn(async () => 81),
  createModuleAssessmentAttempt: vi.fn(async () => 91),
  listAssessmentAttemptsForStudent: vi.fn(async () => [{ id: 91, assessmentId: 81, studentId: 5, passed: 1 }]),
  setLessonCompletion: vi.fn(async () => undefined),
  listCompletedLessonsForStudent: vi.fn(async () => [{ lessonId: 72, completedAt: new Date() }]),
  updateProfile: vi.fn(async (_userId: number, _institutionId: number, input: { profilePhotoUrl?: string | null }) => ({ id: 5, profilePhotoUrl: input.profilePhotoUrl })),
};

vi.mock("./db", () => dbMocks);
vi.mock("./storage", () => ({ storagePut: vi.fn(async () => ({ key: "file-key", url: "/manus-storage/file-key" })) }));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn(async () => ({ choices: [{ message: { content: "respuesta no estructurada" } }] })) }));
vi.mock("./_core/imageGeneration", () => ({ generateImage: vi.fn(async () => ({ url: "/manus-storage/illustration.png" })) }));

const { appRouter } = await import("./routers");

function context(role: "admin" | "teacher" | "student", id = 1): TrpcContext {
  return {
    user: { id, openId: `user-${id}`, name: "Usuario", email: role === "student" ? "student@wijiedu.test" : "user@wijiedu.test", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const studentData = { fullName: "Ana Pérez", email: "ana@wijiedu.test" };
const subjectData = { code: "MAT-01", name: "Matemáticas", period: "2026-1", studentIds: [5, 6] };
const gradeData = { studentId: 5, subjectId: 7, period: "2026-1", title: "Parcial", score: 95 };

describe("router académico", () => {
  it("rechaza cambios de cuentas fuera del tenant activo", async () => {
    const admin = appRouter.createCaller({ ...context("admin"), institutionId: 2 });
    await expect(admin.academic.users.setRole({ userId: 4, role: "teacher" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(admin.academic.users.remove({ userId: 4 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rechaza operaciones académicas por ID fuera del tenant activo", async () => {
    const otherAdmin = appRouter.createCaller({ ...context("admin"), institutionId: 2 });
    await expect(otherAdmin.academic.subjects.update({ id: 7, data: { ...subjectData, color: "#4F8EF7", active: true } })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(otherAdmin.academic.activities.update({ id: 11, data: { title: "Fuera", maxScore: 100, status: "published" } })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(otherAdmin.academic.grades.update({ id: 31, data: { period: "2026-1", title: "Fuera", score: 90, maxScore: 100 } })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(otherAdmin.academic.liveClasses.update({ id: 61, data: { subjectId: 7, title: "Fuera", meetUrl: "https://meet.google.com/abc-defg-hij", startsAt: new Date().toISOString(), durationMinutes: 60, status: "published" } })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(otherAdmin.academic.submissions.grade({ id: 33, score: 80 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("solo permite al administrador consultar cuentas y gestionar estudiantes", async () => {
    const admin = appRouter.createCaller(context("admin"));
    await expect(admin.academic.users.list()).resolves.toHaveLength(1);
    await expect(admin.academic.users.setRole({ userId: 4, role: "teacher" })).resolves.toEqual({ success: true });
    await expect(admin.academic.users.remove({ userId: 4 })).resolves.toEqual({ success: true });
    expect(dbMocks.deleteUserAccount).toHaveBeenCalledWith(4);
    await expect(admin.academic.users.remove({ userId: 1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(admin.academic.users.create({ name: "Docente Nuevo", email: "nuevo@wijiedu.test", password: "Segura123", role: "teacher" })).resolves.toEqual({ id: 19 });
    expect(dbMocks.createLocalUser).toHaveBeenCalledWith(expect.objectContaining({ role: "teacher", email: "nuevo@wijiedu.test", passwordHash: expect.stringMatching(/^scrypt\$/) }));
    await expect(admin.academic.students.create(studentData)).resolves.toEqual({ id: 18 });
    await expect(admin.academic.students.update({ id: 18, data: { ...studentData, status: "active" } })).resolves.toEqual({ success: true });
    await expect(admin.academic.students.remove({ id: 18 })).resolves.toEqual({ success: true });
    const student = appRouter.createCaller(context("student"));
    await expect(student.academic.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(student.academic.users.remove({ userId: 4 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(student.academic.students.create(studentData)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reserva materias, asignaciones e inscripciones para administración", async () => {
    const admin = appRouter.createCaller(context("admin"));
    await expect(admin.academic.subjects.create(subjectData)).resolves.toEqual({ id: 22 });
    expect(dbMocks.createSubjectWithCurriculum).toHaveBeenCalledWith(expect.objectContaining({ studentIds: [5, 6] }));
    await expect(admin.academic.subjects.update({ id: 7, data: { ...subjectData, color: "#4F8EF7", active: true } })).resolves.toEqual({ success: true });
    await expect(admin.academic.subjects.enroll({ studentId: 5, subjectId: 7 })).resolves.toEqual({ success: true });
    await expect(admin.academic.subjects.unenroll({ studentId: 5, subjectId: 7 })).resolves.toEqual({ success: true });
    await expect(admin.academic.subjects.enrollments({ subjectId: 7 })).resolves.toEqual([]);
    await expect(admin.academic.subjects.remove({ id: 7 })).resolves.toEqual({ success: true });
    const teacher = appRouter.createCaller(context("teacher", 2));
    await expect(teacher.academic.subjects.create(subjectData)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(teacher.academic.subjects.enroll({ studentId: 5, subjectId: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite al docente asignado gestionar actividades y notas de su materia", async () => {
    const teacher = appRouter.createCaller(context("teacher", 2));
    await expect(teacher.academic.activities.create({ subjectId: 7, title: "Taller", maxScore: 100, status: "published" })).resolves.toEqual({ id: 27 });
    await expect(teacher.academic.activities.update({ id: 11, data: { title: "Taller actualizado", maxScore: 100, status: "published" } })).resolves.toEqual({ success: true });
    await expect(teacher.academic.activities.remove({ id: 11 })).resolves.toEqual({ success: true });
    await expect(teacher.academic.grades.create(gradeData)).resolves.toEqual({ id: 31 });
    await expect(teacher.academic.grades.update({ id: 31, data: { period: "2026-1", title: "Parcial corregido", score: 90, maxScore: 100 } })).resolves.toEqual({ success: true });
    await expect(teacher.academic.grades.remove({ id: 31 })).resolves.toEqual({ success: true });
    const student = appRouter.createCaller(context("student", 5));
    await expect(student.academic.activities.create({ subjectId: 7, title: "No permitido", maxScore: 100, status: "draft" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(student.academic.grades.create(gradeData)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite al estudiante entregar y al docente calificar", async () => {
    const student = appRouter.createCaller(context("student", 5));
    await expect(student.academic.submissions.submit({ activityId: 11, content: "Trabajo entregado" })).resolves.toEqual({ success: true });
    const teacher = appRouter.createCaller(context("teacher", 2));
    await expect(teacher.academic.submissions.grade({ id: 33, score: 88, feedback: "Buen trabajo" })).resolves.toEqual({ success: true });
    await expect(teacher.academic.submissions.submit({ activityId: 11, content: "No permitido" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(student.academic.submissions.grade({ id: 33, score: 88 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite al estudiante enviar un mensaje al docente de su materia", async () => {
    const student = appRouter.createCaller(context("student", 5));
    await expect(student.academic.messages.send({ subjectId: 7, recipientId: 2, body: "Tengo una duda sobre la actividad." })).resolves.toEqual({ id: 44 });
    expect(dbMocks.createMessage).toHaveBeenCalledWith(expect.objectContaining({ subjectId: 7, senderId: 5, recipientId: 2 }));
  });

  it("expone los módulos detallados solo a quienes tienen acceso a la materia", async () => {
    const student = appRouter.createCaller(context("student", 5));
    await expect(student.academic.curriculum.modules({ subjectId: 7 })).resolves.toHaveLength(1);
    expect(dbMocks.listCourseModulesForSubject).toHaveBeenCalledWith(7, 1);
    await expect(student.academic.ai.createGeneratedCourse({ topic: "Economía aplicada", level: "intermediate", period: "2026-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite a administración generar una materia completa con competencias, módulos e ilustraciones", async () => {
    const admin = appRouter.createCaller(context("admin"));
    await expect(admin.academic.ai.createGeneratedCourse({ topic: "Gestión de proyectos", level: "intermediate", period: "2026-2" })).resolves.toMatchObject({ id: 22 });
    expect(dbMocks.createSubjectWithCurriculum).toHaveBeenLastCalledWith(expect.objectContaining({
      name: "Gestión de proyectos",
      period: "2026-2",
      competencies: expect.arrayContaining([expect.objectContaining({ title: expect.stringContaining("Gestión de proyectos") })]),
      modules: expect.arrayContaining([expect.objectContaining({ imageUrl: "/manus-storage/illustration.png", lessons: expect.any(Array), assessment: expect.objectContaining({ questions: expect.any(Array), passingScore: 70 }) })]),
    }));
  });

  it("valida y persiste fotos de perfil mediante almacenamiento seguro", async () => {
    const teacher = appRouter.createCaller(context("teacher", 2));
    await expect(teacher.academic.profile.uploadPhoto({ fileName: "perfil.png", mimeType: "image/png", base64: "aGVsbG8=" })).resolves.toMatchObject({ profilePhotoUrl: "/manus-storage/file-key" });
    await expect(teacher.academic.profile.uploadPhoto({ fileName: "perfil.txt", mimeType: "text/plain", base64: "aGVsbG8=" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("permite al estudiante resolver evaluaciones y registrar avance sin exponer respuestas correctas", async () => {
    const student = appRouter.createCaller(context("student", 5));
    const assessments = await student.academic.curriculum.assessments({ moduleId: 71 });
    expect(assessments[0].questions[0]).not.toHaveProperty("correctOption");
    await expect(student.academic.curriculum.setLessonProgress({ lessonId: 72, completed: true })).resolves.toEqual({ success: true });
    expect(dbMocks.setLessonCompletion).toHaveBeenCalledWith({ lessonId: 72, studentId: 5, completed: true, institutionId: 1 });
    await expect(student.academic.curriculum.submitAssessment({ assessmentId: 81, answers: [{ questionId: "q1", selectedOption: 0 }] })).resolves.toMatchObject({ id: 91, score: 1, maxScore: 1, percentage: 100, passed: true });
    const progress = await student.academic.curriculum.progress({ subjectId: 7 });
    expect(progress).toMatchObject({ isStudent: true, completedLessons: 1, totalLessons: 1, percentage: 100, completedModuleIds: [71], passedAssessmentIds: [81] });
    await expect(student.academic.curriculum.generateAssessment({ moduleId: 71 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("separa la gestión institucional de la operación académica docente", async () => {
    const admin = appRouter.createCaller(context("admin", 1));
    const teacher = appRouter.createCaller(context("teacher", 2));
    const activity = { subjectId: 7, title: "Actividad docente", description: "Trabajo", dueAt: new Date("2026-09-10T12:00:00.000Z").toISOString(), maxScore: 100, status: "published" as const };
    await expect(admin.academic.activities.create(activity)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(admin.academic.grades.create(gradeData)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(admin.academic.submissions.grade({ id: 33, score: 90, feedback: "Revisado" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(teacher.academic.activities.create(activity)).resolves.toEqual({ id: 27 });
    await expect(teacher.academic.grades.create(gradeData)).resolves.toEqual({ id: 31 });
    await expect(teacher.academic.submissions.grade({ id: 33, score: 90, feedback: "Revisado" })).resolves.toEqual({ success: true });
  });

  it("permite al docente asignado gestionar sus propias clases de Meet", async () => {
    const teacher = appRouter.createCaller(context("teacher", 2));
    const data = { subjectId: 7, title: "Clase del docente", meetUrl: "https://meet.google.com/abc-defg-hij", startsAt: new Date("2026-08-23T15:00:00.000Z").toISOString(), durationMinutes: 60, status: "published" as const };
    await expect(teacher.academic.liveClasses.create(data)).resolves.toEqual({ id: 61 });
    await expect(teacher.academic.liveClasses.update({ id: 61, data: { title: "Clase actualizada", meetUrl: data.meetUrl, startsAt: data.startsAt, durationMinutes: 60, status: "published" } })).resolves.toEqual({ success: true });
    await expect(teacher.academic.liveClasses.remove({ id: 61 })).resolves.toEqual({ success: true });
    const otherTeacher = appRouter.createCaller(context("teacher", 9));
    await expect(otherTeacher.academic.liveClasses.create(data)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reserva la publicación de clases de Meet para administración y permite su consulta al estudiante", async () => {
    const liveClass = { subjectId: 7, title: "Tutoría en vivo", meetUrl: "https://meet.google.com/abc-defg-hij", startsAt: new Date("2026-08-23T15:00:00.000Z").toISOString(), durationMinutes: 60, status: "published" as const };
    const admin = appRouter.createCaller(context("admin"));
    await expect(admin.academic.liveClasses.create(liveClass)).resolves.toEqual({ id: 61 });
    await expect(admin.academic.liveClasses.create({ ...liveClass, meetUrl: "https://example.com/reunion" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createLiveClass).toHaveBeenCalledWith(expect.objectContaining({ subjectId: 7, createdBy: 1, status: "published" }));
    await expect(admin.academic.liveClasses.update({ id: 61, data: { ...liveClass, subjectId: undefined } })).resolves.toEqual({ success: true });
    await expect(admin.academic.liveClasses.remove({ id: 61 })).resolves.toEqual({ success: true });
    const student = appRouter.createCaller(context("student", 5));
    await expect(student.academic.liveClasses.list()).resolves.toHaveLength(1);
    await expect(student.academic.liveClasses.create(liveClass)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(student.academic.liveClasses.update({ id: 61, data: { ...liveClass, subjectId: undefined } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(student.academic.liveClasses.remove({ id: 61 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
