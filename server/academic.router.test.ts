import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = {
  listUsers: vi.fn(async () => [{ id: 4, role: "teacher", name: "Docente" }]),
  updateUserRole: vi.fn(async () => undefined),
  createStudent: vi.fn(async () => 18),
  updateStudent: vi.fn(async () => undefined),
  deleteStudent: vi.fn(async () => undefined),
  createSubject: vi.fn(async () => 22),
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
const subjectData = { code: "MAT-01", name: "Matemáticas", period: "2026-1" };
const gradeData = { studentId: 5, subjectId: 7, period: "2026-1", title: "Parcial", score: 95 };

describe("router académico", () => {
  it("solo permite al administrador consultar cuentas y gestionar estudiantes", async () => {
    const admin = appRouter.createCaller(context("admin"));
    await expect(admin.academic.users.list()).resolves.toHaveLength(1);
    await expect(admin.academic.users.setRole({ userId: 4, role: "teacher" })).resolves.toEqual({ success: true });
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
});
