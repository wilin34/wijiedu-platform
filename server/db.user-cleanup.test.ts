import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { activities, courseResources, grades, liveClasses, messages, moduleAssessmentAttempts, moduleAssessments, students, submissions, users } from "../drizzle/schema";
import * as db from "./db";

let subjectId: number | undefined;
let teacherId: number | undefined;
let studentUserId: number | undefined;

afterAll(async () => {
  if (subjectId) await db.deleteSubject(subjectId).catch(() => undefined);
  if (teacherId) await db.deleteUserAccount(teacherId).catch(() => undefined);
  if (studentUserId) await db.deleteUserAccount(studentUserId).catch(() => undefined);
});

describe("deleteUserAccount", () => {
  it("elimina o sanea registros académicos que dependían de una cuenta", async () => {
    const stamp = Date.now();
    const teacher = await db.createLocalUser({ name: "Docente temporal", email: `docente.cleanup.${stamp}@wijiedu.test`, passwordHash: "scrypt$test$0011", role: "teacher" });
    const studentUser = await db.createLocalUser({ name: "Estudiante temporal", email: `estudiante.cleanup.${stamp}@wijiedu.test`, passwordHash: "scrypt$test$0011", role: "student" });
    expect(teacher).toBeTruthy();
    expect(studentUser).toBeTruthy();
    teacherId = teacher!.id;
    studentUserId = studentUser!.id;
    const student = await db.getStudentForUser(studentUser!.id, studentUser!.email);
    expect(student).toBeTruthy();

    subjectId = await db.createSubject({ code: `CU-${stamp.toString().slice(-7)}`, name: "Materia temporal de limpieza", period: "QA", teacherId: teacher!.id, color: "#B69A5E" });
    await db.enrollStudent(student!.id, subjectId);
    const moduleId = await db.createCourseModule({ subjectId, title: "Módulo temporal de limpieza", overview: "Módulo para comprobar que la eliminación de usuarios limpia las referencias de autoría académica.", learningObjectives: ["Verificar limpieza", "Proteger integridad"], estimatedHours: 2, sortOrder: 1 });
    const assessmentId = await db.createModuleAssessment({ moduleId, title: "Evaluación temporal", description: "Evaluación para comprobar limpieza de datos.", questions: [{ id: "q1", prompt: "Pregunta temporal con contexto suficiente.", options: ["A", "B", "C", "D"], correctOption: 0, explanation: "Explicación temporal para la prueba." }], passingScore: 70, status: "published", createdBy: teacher!.id });
    await db.createModuleAssessmentAttempt({ assessmentId, studentId: student!.id, answers: [{ questionId: "q1", selectedOption: 0 }], score: 1, maxScore: 1, passed: true });
    const activityId = await db.createActivity({ subjectId, createdBy: teacher!.id, title: "Actividad temporal", status: "published", maxScore: 100, dueAt: null });
    const resourceId = await db.createCourseResource({ subjectId, title: "Recurso temporal", description: "Recurso para comprobar limpieza de la autoría.", resourceType: "reading", url: null, createdBy: teacher!.id });
    const liveClassId = await db.createLiveClass({ subjectId, title: "Clase temporal", description: "Clase para validar limpieza.", meetUrl: "https://meet.google.com/abc-defg-hij", startsAt: new Date(), durationMinutes: 60, status: "draft", createdBy: teacher!.id });
    const messageId = await db.createMessage({ subjectId, senderId: teacher!.id, recipientId: studentUser!.id, body: "Mensaje temporal de limpieza." });
    await db.createSubmission({ activityId, studentId: student!.id, content: "Entrega temporal de limpieza." });
    await db.createGrade({ studentId: student!.id, subjectId, period: "QA", title: "Nota temporal", score: 90, maxScore: 100, gradedBy: teacher!.id });

    await db.deleteUserAccount(teacher!.id);
    teacherId = undefined;
    const connection = await db.getDb();
    expect(connection).toBeTruthy();
    expect(await connection!.select().from(users).where(eq(users.id, teacher!.id))).toHaveLength(0);
    expect(await connection!.select().from(moduleAssessments).where(eq(moduleAssessments.id, assessmentId))).toHaveLength(0);
    expect(await connection!.select().from(moduleAssessmentAttempts).where(eq(moduleAssessmentAttempts.assessmentId, assessmentId))).toHaveLength(0);
    expect(await connection!.select().from(activities).where(eq(activities.id, activityId))).toHaveLength(0);
    expect(await connection!.select().from(submissions).where(eq(submissions.activityId, activityId))).toHaveLength(0);
    expect(await connection!.select().from(courseResources).where(eq(courseResources.id, resourceId))).toHaveLength(0);
    expect(await connection!.select().from(liveClasses).where(eq(liveClasses.id, liveClassId))).toHaveLength(0);
    expect(await connection!.select().from(messages).where(eq(messages.id, messageId))).toHaveLength(0);
    expect(await connection!.select().from(grades).where(eq(grades.subjectId, subjectId!))).toHaveLength(0);
    expect((await db.getSubjectById(subjectId))?.teacherId).toBeNull();

    const studentMessageId = await db.createMessage({ subjectId, senderId: studentUser!.id, recipientId: 1, body: "Mensaje de estudiante temporal." });
    await db.deleteUserAccount(studentUser!.id);
    studentUserId = undefined;
    expect(await connection!.select().from(users).where(eq(users.id, studentUser!.id))).toHaveLength(0);
    expect(await connection!.select().from(students).where(eq(students.userId, studentUser!.id))).toHaveLength(0);
    expect(await connection!.select().from(messages).where(eq(messages.id, studentMessageId))).toHaveLength(0);
  });
});
