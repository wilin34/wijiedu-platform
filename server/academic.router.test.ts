import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = {
  listUsers: vi.fn(async () => [{ id: 4, role: "teacher", name: "Docente" }]),
  updateUserRole: vi.fn(async () => undefined),
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
  getSubjectById: vi.fn(async () => ({ id: 7, teacherId: 2 })),
  getActivityById: vi.fn(async () => ({ id: 11, subjectId: 7, status: "published" })),
  createActivity: vi.fn(async () => 27),
  updateActivity: vi.fn(async () => undefined),
  deleteActivity: vi.fn(async () => undefined),
  isStudentEnrolled: vi.fn(async () => true),
  getGradeById: vi.fn(async () => ({ id: 31, subjectId: 7 })),
  createGrade: vi.fn(async () => 31),
  updateGrade: vi.fn(async () => undefined),
  deleteGrade: vi.fn(async () => undefined),
  getStudentForUser: vi.fn(async () => ({ id: 5, email: "student@wijiedu.test" })),
  createSubmission: vi.fn(async () => undefined),
  getSubmissionById: vi.fn(async () => ({ id: 33, activityId: 11, studentId: 5, subjectId: 7 })),
  gradeSubmission: vi.fn(async () => undefined),
  canAccessSubject: vi.fn(async () => true),
  listMessageRecipients: vi.fn(async () => [{ id: 2, name: "Docente", email: "teacher@wijiedu.test", role: "teacher" }]),
  listMessagesForUser: vi.fn(async () => []),
  createMessage: vi.fn(async () => 44),
  listLiveClassesForUser: vi.fn(async () => [{ id: 61, subjectId: 7, title: "Tutoría", meetUrl: "https://meet.google.com/abc-defg-hij", startsAt: new Date(), durationMinutes: 60, status: "published" }]),
  createLiveClass: vi.fn(async () => 61),
  getLiveClassById: vi.fn(async () => ({ id: 61, subjectId: 7, createdBy: 1 })),
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
};

vi.mock("./db", () => dbMocks);
vi.mock("./storage", () => ({ storagePut: vi.fn(async () => ({ key: "file-key", url: "/manus-storage/file-key" })) }));

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
  it("solo permite al administrador consultar cuentas y gestionar estudiantes", async () => {
    const admin = appRouter.createCaller(context("admin"));
    await expect(admin.academic.users.list()).resolves.toHaveLength(1);
    await expect(admin.academic.users.setRole({ userId: 4, role: "teacher" })).resolves.toEqual({ success: true });
    await expect(admin.academic.users.create({ name: "Docente Nuevo", email: "nuevo@wijiedu.test", password: "Segura123", role: "teacher" })).resolves.toEqual({ id: 19 });
    expect(dbMocks.createLocalUser).toHaveBeenCalledWith(expect.objectContaining({ role: "teacher", email: "nuevo@wijiedu.test", passwordHash: expect.stringMatching(/^scrypt\$/) }));
    await expect(admin.academic.students.create(studentData)).resolves.toEqual({ id: 18 });
    await expect(admin.academic.students.update({ id: 18, data: { ...studentData, status: "active" } })).resolves.toEqual({ success: true });
    await expect(admin.academic.students.remove({ id: 18 })).resolves.toEqual({ success: true });
    const student = appRouter.createCaller(context("student"));
    await expect(student.academic.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
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
    expect(dbMocks.listCourseModulesForSubject).toHaveBeenCalledWith(7);
    await expect(student.academic.ai.createGeneratedCourse({ topic: "Economía aplicada", level: "intermediate", period: "2026-1" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite al estudiante resolver evaluaciones y registrar avance sin exponer respuestas correctas", async () => {
    const student = appRouter.createCaller(context("student", 5));
    const assessments = await student.academic.curriculum.assessments({ moduleId: 71 });
    expect(assessments[0].questions[0]).not.toHaveProperty("correctOption");
    await expect(student.academic.curriculum.setLessonProgress({ lessonId: 72, completed: true })).resolves.toEqual({ success: true });
    expect(dbMocks.setLessonCompletion).toHaveBeenCalledWith({ lessonId: 72, studentId: 5, completed: true });
    await expect(student.academic.curriculum.submitAssessment({ assessmentId: 81, answers: [{ questionId: "q1", selectedOption: 0 }] })).resolves.toMatchObject({ id: 91, score: 1, maxScore: 1, percentage: 100, passed: true });
    const progress = await student.academic.curriculum.progress({ subjectId: 7 });
    expect(progress).toMatchObject({ isStudent: true, completedLessons: 1, totalLessons: 1, percentage: 100, completedModuleIds: [71], passedAssessmentIds: [81] });
    await expect(student.academic.curriculum.generateAssessment({ moduleId: 71 })).rejects.toMatchObject({ code: "FORBIDDEN" });
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
