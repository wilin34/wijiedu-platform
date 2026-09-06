import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx-js-style";
import { buildGradesWorkbook, safeExcelFileName } from "./exportGradesExcel";

describe("exportGradesExcel", () => {
  it("genera un libro con resumen, detalle y consolidado", () => {
    expect(safeExcelFileName("José Pérez")).toBe("jose-perez");
    const row = { studentName: "Ana Gómez", studentEmail: "ana@example.com", subjectName: "Finanzas", subjectCode: "FIN-101", teacherName: "Docente", teacherEmail: "docente@example.com", period: "2026-1", title: "Actividad 1", score: 90, maxScore: 100, gradedAt: new Date("2026-08-01"), notes: "Buen trabajo" };
    const workbook = buildGradesWorkbook([row], "Institución demostrativa", { primaryColor: "#C6A867", secondaryColor: "#173B3F" });
    expect(workbook.SheetNames).toEqual(["Resumen", "Detalle de notas", "Consolidado"]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets["Detalle de notas"])[0]).toMatchObject({ Estudiante: "Ana Gómez", Materia: "Finanzas", Nota: 90 });
    expect(workbook.Sheets.Resumen.A1.s).toMatchObject({ fill: { fgColor: { rgb: "173B3F" } } });
    expect(workbook.Sheets["Detalle de notas"].A1.s).toMatchObject({ fill: { fgColor: { rgb: "C6A867" } } });
  });
});
