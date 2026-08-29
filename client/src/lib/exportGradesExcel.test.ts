import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildGradesWorkbook, safeExcelFileName } from "./exportGradesExcel";

describe("exportGradesExcel", () => {
  it("genera un libro con resumen, detalle y consolidado", () => {
    expect(safeExcelFileName("José Pérez")).toBe("jose-perez");
    const row = { studentName: "Ana Gómez", studentEmail: "ana@example.com", subjectName: "Finanzas", subjectCode: "FIN-101", teacherName: "Docente", teacherEmail: "docente@example.com", period: "2026-1", title: "Actividad 1", score: 90, maxScore: 100, gradedAt: new Date("2026-08-01"), notes: "Buen trabajo" };
    const workbook = buildGradesWorkbook([row], "Institución demostrativa");
    expect(workbook.SheetNames).toEqual(["Resumen", "Detalle de notas", "Consolidado"]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets["Detalle de notas"])[0]).toMatchObject({ Estudiante: "Ana Gómez", Materia: "Finanzas", Nota: 90 });
  });
});
