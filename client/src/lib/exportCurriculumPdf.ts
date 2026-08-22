import { jsPDF } from "jspdf";

type ExportSubject = { code: string; name: string; description: string | null; period: string };
type ExportModule = { title: string; overview: string; estimatedHours: number; learningObjectives: string[]; lessons: Array<{ title: string; summary: string; explanation: string; keyTopics: string[]; classActivity: string | null }> };
type ExportCompetency = { title: string; description: string | null; level: string };
type ExportResource = { title: string; description: string | null; resourceType: string; url: string | null };

function safeFileName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
}

export function exportCurriculumPdf(subject: ExportSubject, modules: ExportModule[], competencies: ExportCompetency[], resources: ExportResource[]) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const width = 210 - margin * 2;
  let cursorY = 20;

  const addPageIfNeeded = (height = 12) => {
    if (cursorY + height <= 278) return;
    pdf.addPage();
    cursorY = 20;
  };

  const write = (text: string, size = 10, style: "normal" | "bold" = "normal", color: [number, number, number] = [41, 45, 42], gap = 4) => {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, width) as string[];
    addPageIfNeeded(lines.length * (size * 0.45) + gap);
    pdf.text(lines, margin, cursorY);
    cursorY += lines.length * (size * 0.45) + gap;
  };

  pdf.setFillColor(27, 32, 29);
  pdf.rect(0, 0, 210, 42, "F");
  pdf.setFillColor(182, 154, 94);
  pdf.rect(0, 0, 210, 4, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(216, 191, 134);
  pdf.text("WIJIEDU · PLAN DE ESTUDIOS", margin, 16);
  pdf.setFontSize(22);
  pdf.setTextColor(255, 255, 255);
  pdf.text(subject.name, margin, 28);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(221, 221, 213);
  pdf.text(`${subject.code} · Período ${subject.period}`, margin, 36);
  cursorY = 54;

  write("Descripción de la materia", 14, "bold", [23, 26, 23], 5);
  write(subject.description || "Plan de estudios organizado por módulos, lecciones y actividades de aprendizaje.", 10, "normal", [53, 59, 54], 8);

  write("Competencias", 14, "bold", [23, 26, 23], 5);
  if (competencies.length) competencies.forEach((item, index) => write(`${index + 1}. ${item.title} (${item.level}). ${item.description || "Competencia académica del curso."}`, 10, "normal", [53, 59, 54], 3));
  else write("No hay competencias registradas.", 10, "normal", [90, 95, 89], 6);

  write("Recursos de apoyo", 14, "bold", [23, 26, 23], 5);
  if (resources.length) resources.forEach((item, index) => write(`${index + 1}. ${item.title} · ${item.resourceType}. ${item.description || "Material de consulta."}${item.url ? ` URL: ${item.url}` : ""}`, 10, "normal", [53, 59, 54], 3));
  else write("No hay recursos registrados.", 10, "normal", [90, 95, 89], 6);

  write("Módulos y plan de clases", 14, "bold", [23, 26, 23], 5);
  modules.forEach((courseModule, moduleIndex) => {
    addPageIfNeeded(28);
    write(`Módulo ${moduleIndex + 1}: ${courseModule.title} · ${courseModule.estimatedHours} horas`, 12, "bold", [134, 105, 47], 3);
    write(courseModule.overview, 10, "normal", [53, 59, 54], 3);
    write(`Resultados de aprendizaje: ${courseModule.learningObjectives.join(" · ")}`, 9, "normal", [76, 82, 76], 4);
    courseModule.lessons.forEach((lesson, lessonIndex) => {
      write(`${moduleIndex + 1}.${lessonIndex + 1} ${lesson.title}`, 11, "bold", [23, 26, 23], 2);
      write(`Propósito: ${lesson.summary}`, 9, "normal", [53, 59, 54], 2);
      write(`Explicación: ${lesson.explanation}`, 9, "normal", [53, 59, 54], 2);
      write(`Temas clave: ${lesson.keyTopics.join(" · ")}`, 9, "normal", [76, 82, 76], 2);
      if (lesson.classActivity) write(`Actividad: ${lesson.classActivity}`, 9, "normal", [76, 82, 76], 4);
    });
  });

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(115, 120, 114);
    pdf.text(`WijiEdu · ${subject.code} · Página ${page} de ${pages}`, margin, 289);
  }
  pdf.save(`${safeFileName(subject.code)}-${safeFileName(subject.name)}-plan-de-estudios.pdf`);
}
