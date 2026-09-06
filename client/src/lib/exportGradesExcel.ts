import * as XLSX from "xlsx-js-style";

export type ExcelGradeRow = {
  studentName: string;
  studentEmail?: string | null;
  subjectName: string;
  subjectCode: string;
  teacherName?: string | null;
  teacherEmail?: string | null;
  period: string;
  title: string;
  score: number;
  maxScore: number;
  gradedAt: Date | string;
  notes?: string | null;
};

export function safeExcelFileName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

function dateLabel(value: Date | string) {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(value));
}

function colorCode(value: string | undefined, fallback: string) { return (value || fallback).replace("#", "").toUpperCase(); }
function styleWorkbook(workbook: XLSX.WorkBook, branding?: { primaryColor?: string; secondaryColor?: string }) {
  const navy = colorCode(branding?.secondaryColor, "173B3F");
  const green = colorCode(branding?.primaryColor, "2F5D50");
  const gold = colorCode(branding?.primaryColor, "C6A867");
  const pale = "F3EEE3";
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const range = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : null;
    if (!range) continue;
    sheet["!freeze"] = { xSplit: 0, ySplit: sheetName === "Resumen" ? 5 : 1 };
    sheet["!rows"] = Array.from({ length: range.e.r + 1 }, (_, index) => ({ hpt: index === 0 ? 26 : 20 }));
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      for (let col = range.s.c; col <= range.e.c; col += 1) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })] as XLSX.CellObject | undefined;
        if (!cell) continue;
        const isHeader = sheetName === "Resumen" ? row === 4 : row === 0;
        const isTitle = sheetName === "Resumen" && row === 0;
        cell.s = isTitle ? { font: { bold: true, color: "FFFFFF", sz: 16 }, fill: { fgColor: { rgb: navy } }, alignment: { vertical: "center", horizontal: "left" } } : isHeader ? { font: { bold: true, color: "FFFFFF" }, fill: { fgColor: { rgb: green } }, alignment: { vertical: "center", wrapText: true }, border: { bottom: { style: "thin", color: { rgb: gold } } } } : { font: { color: "23312B" }, fill: { fgColor: { rgb: row % 2 ? "FFFFFF" : pale } }, alignment: { vertical: "center", wrapText: true } };
      }
    }
    if (sheetName === "Resumen") {
      for (const address of ["A1", "A2", "A3", "A11", "A12"]) { const cell = sheet[address] as XLSX.CellObject | undefined; if (cell) cell.s = { ...(cell.s || {}), font: { color: address === "A1" ? "FFFFFF" : navy, bold: address === "A1" || address === "A11" }, alignment: { vertical: "center", wrapText: true } }; }
    }
  }
}

export function buildGradesWorkbook(rows: ExcelGradeRow[], institutionName = "Institución activa", branding?: { primaryColor?: string; secondaryColor?: string }) {
  const workbook = XLSX.utils.book_new();
  const generatedAt = new Date();
  const average = rows.length ? rows.reduce((sum, row) => sum + (row.score / row.maxScore) * 100, 0) / rows.length : 0;
  const students = Array.from(new Map(rows.map(row => [row.studentEmail || row.studentName, row])).values());
  const summary = [
    ["WIJIEDU · INFORME ACADÉMICO DE CALIFICACIONES"],
    [institutionName],
    ["Generado", generatedAt.toLocaleString("es-CO")],
    [],
    ["Indicador", "Valor"],
    ["Registros de calificación", rows.length],
    ["Estudiantes incluidos", students.length],
    ["Materias incluidas", new Set(rows.map(row => row.subjectCode)).size],
    ["Promedio porcentual", `${average.toFixed(1)}%`],
    [],
    ["Responsable del informe", "Sistema académico WijiEdu"],
    ["Nota", "Los datos corresponden únicamente a las calificaciones registradas en la institución activa."],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summary);
  summarySheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }];
  summarySheet["!cols"] = [{ wch: 34 }, { wch: 58 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");

  const detail = rows.map(row => ({
    Estudiante: row.studentName,
    "Correo estudiante": row.studentEmail || "",
    Código: row.subjectCode,
    Materia: row.subjectName,
    Docente: row.teacherName || "No registrado",
    "Correo docente": row.teacherEmail || "",
    Período: row.period,
    Evaluación: row.title,
    Nota: row.score,
    "Máximo": row.maxScore,
    "Porcentaje": `${((row.score / row.maxScore) * 100).toFixed(1)}%`,
    Fecha: dateLabel(row.gradedAt),
    Observaciones: row.notes || "",
  }));
  const detailSheet = XLSX.utils.json_to_sheet(detail);
  detailSheet["!autofilter"] = { ref: detailSheet["!ref"] || "A1:M1" };
  detailSheet["!cols"] = [{ wch: 24 }, { wch: 30 }, { wch: 12 }, { wch: 30 }, { wch: 24 }, { wch: 30 }, { wch: 16 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 13 }, { wch: 18 }, { wch: 38 }];
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Detalle de notas");

  const grouped = new Map<string, { studentName: string; email: string; count: number; total: number }>();
  rows.forEach(row => {
    const key = row.studentEmail || row.studentName;
    const current = grouped.get(key) || { studentName: row.studentName, email: row.studentEmail || "", count: 0, total: 0 };
    current.count += 1;
    current.total += (row.score / row.maxScore) * 100;
    grouped.set(key, current);
  });
  const consolidated = Array.from(grouped.values()).map(row => ({ Estudiante: row.studentName, Correo: row.email, "Evaluaciones registradas": row.count, "Promedio porcentual": `${(row.total / row.count).toFixed(1)}%` }));
  const consolidatedSheet = XLSX.utils.json_to_sheet(consolidated);
  consolidatedSheet["!autofilter"] = { ref: consolidatedSheet["!ref"] || "A1:D1" };
  consolidatedSheet["!cols"] = [{ wch: 28 }, { wch: 34 }, { wch: 25 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(workbook, consolidatedSheet, "Consolidado");
  styleWorkbook(workbook, branding);
  return workbook;
}

export function exportGradesExcel(rows: ExcelGradeRow[], institutionName = "Institución activa", branding?: { primaryColor?: string; secondaryColor?: string }) {
  const workbook = buildGradesWorkbook(rows, institutionName, branding);
  XLSX.writeFile(workbook, `${safeExcelFileName(rows[0]?.studentName || institutionName)}-informe-notas.xlsx`);
}

export default exportGradesExcel;
