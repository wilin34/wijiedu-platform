import { afterAll, describe, expect, it } from "vitest";
import * as db from "./db";

let createdSubjectId: number | undefined;

afterAll(async () => {
  if (createdSubjectId) await db.deleteSubject(createdSubjectId);
});

describe("createSubjectWithCurriculum", () => {
  it("inscribe de forma persistente a cada estudiante seleccionado", async () => {
    const students = await db.listStudents();
    expect(students.length).toBeGreaterThan(0);
    const selectedStudentIds = students.slice(0, Math.min(2, students.length)).map(student => student.id);
    const code = `IT-${Date.now().toString().slice(-8)}`;

    createdSubjectId = await db.createSubjectWithCurriculum({
      code,
      name: "Validación temporal de matrícula",
      description: "Registro temporal creado y eliminado por la prueba de integración.",
      period: "QA",
      color: "#4F8EF7",
      studentIds: selectedStudentIds,
      createdBy: 570001,
    });

    const enrolled = await db.listEnrollmentsForSubject(createdSubjectId);
    expect(enrolled.map(item => item.studentId).sort()).toEqual([...selectedStudentIds].sort());
  });
});
