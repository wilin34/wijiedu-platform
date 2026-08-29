import { jsPDF } from "jspdf";

export type GradeReportRow = {
  id?: number;
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

export function safeGradeFileName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export function exportGradesPdf(rows: GradeReportRow[], institutionName = "WijiEdu") {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const width = 174;
  let y = 20;
  const write = (text: string, size = 10, bold = false, gap = 5) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(43, 47, 43);
    const lines = pdf.splitTextToSize(text, width) as string[];
    if (y + lines.length * 5 + gap > 278) { pdf.addPage(); y = 20; }
    pdf.text(lines, margin, y);
    y += lines.length * 5 + gap;
  };
  pdf.setFillColor(27, 32, 29); pdf.rect(0, 0, 210, 42, "F");
  pdf.setFillColor(182, 154, 94); pdf.rect(0, 0, 210, 4, "F");
  pdf.setTextColor(216, 191, 134); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.text("WIJIEDU · INFORME ACADÉMICO", margin, 16);
  pdf.setTextColor(255, 255, 255); pdf.setFontSize(20); pdf.text(institutionName, margin, 28);
  pdf.setTextColor(221, 221, 213); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.text(`Generado el ${new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date())}`, margin, 36);
  y = 56;
  if (!rows.length) write("No hay calificaciones para exportar.", 12, true);
  else {
    const first = rows[0];
    write("Identificación académica", 14, true, 4);
    write(`Estudiante: ${first.studentName}${first.studentEmail ? ` · ${first.studentEmail}` : ""}`, 10, false, 3);
    write(`Curso: ${first.subjectCode} · ${first.subjectName}`, 10, false, 3);
    write(`Docente: ${first.teacherName || "No registrado"}${first.teacherEmail ? ` · ${first.teacherEmail}` : ""}`, 10, false, 3);
    write(`Período: ${first.period}`, 10, false, 8);
    write("Detalle de calificaciones", 14, true, 4);
    rows.forEach((row, index) => write(`${index + 1}. ${row.title} · ${row.score}/${row.maxScore} · ${row.period} · ${new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(row.gradedAt))}${row.notes ? ` · Observación: ${row.notes}` : ""}`, 10, false, 4));
  }
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) { pdf.setPage(page); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(115, 120, 114); pdf.text(`WijiEdu · Informe de notas · Página ${page} de ${pages}`, margin, 289); }
  pdf.save(`${safeGradeFileName(rows[0]?.studentName || "informe")}-notas.pdf`);
}

export default exportGradesPdf;
