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
      modules: [{
        title: "Módulo temporal de validación",
        overview: "Módulo temporal creado para comprobar el guardado de objetivos, lecciones y contenidos detallados.",
        learningObjectives: ["Reconocer el flujo de persistencia", "Verificar las lecciones creadas"],
        estimatedHours: 2,
        imagePrompt: "Ilustración temporal para validación",
        lessons: [{
          title: "Lección temporal de validación",
          summary: "Lección creada por la prueba de integración del currículo detallado.",
          explanation: "Esta explicación temporal verifica que el contenido detallado de una clase se almacene junto con sus temas clave y pueda ser consultado después de crear la materia.",
          keyTopics: ["Persistencia", "Módulos", "Lecciones"],
          classActivity: "Revisar el registro persistido.",
        }],
      }],
      createdBy: 570001,
    });

    const enrolled = await db.listEnrollmentsForSubject(createdSubjectId);
    expect(enrolled.map(item => item.studentId).sort()).toEqual([...selectedStudentIds].sort());
    const modules = await db.listCourseModulesForSubject(createdSubjectId);
    expect(modules).toHaveLength(1);
    expect(modules[0].learningObjectives).toContain("Reconocer el flujo de persistencia");
    expect(modules[0].lessons).toHaveLength(1);
    expect(modules[0].lessons[0].keyTopics).toContain("Módulos");
  });
});
