import { beforeEach, describe, expect, it, vi } from "vitest";

const save = vi.fn();
const pdf = {
  setFillColor: vi.fn(), rect: vi.fn(), setFont: vi.fn(), setFontSize: vi.fn(), setTextColor: vi.fn(), text: vi.fn(),
  splitTextToSize: vi.fn((text: string) => [text]), addPage: vi.fn(), getNumberOfPages: vi.fn(() => 1), setPage: vi.fn(), save,
};

vi.mock("jspdf", () => ({ jsPDF: vi.fn(() => pdf) }));

const { exportCurriculumPdf } = await import("./exportCurriculumPdf");

describe("exportCurriculumPdf", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("genera un PDF descargable con el programa de la materia", () => {
    exportCurriculumPdf(
      { code: "FIN-101", name: "Fundamentos de Finanzas", description: "Curso de validación.", period: "2026-1" },
      [{ title: "Presupuesto", overview: "Fundamentos para organizar ingresos y gastos.", estimatedHours: 2, learningObjectives: ["Analizar ingresos"], lessons: [{ title: "Ingresos y gastos", summary: "Introducción a las finanzas.", explanation: "Explicación detallada para revisar ingresos, gastos y decisiones de presupuesto personal.", keyTopics: ["Ingresos", "Gastos", "Presupuesto"], classActivity: "Crear una tabla inicial." }] }],
      [{ title: "Planificar finanzas", description: "Organiza recursos personales.", level: "basic" }],
      [{ title: "Guía", description: "Lectura de apoyo.", resourceType: "reading", url: null }]
    );
    expect(save).toHaveBeenCalledWith("fin-101-fundamentos-de-finanzas-plan-de-estudios.pdf");
    expect(pdf.text).toHaveBeenCalled();
  });
});
