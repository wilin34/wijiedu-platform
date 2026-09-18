import { describe, expect, it } from "vitest";
import { canManageExams, canReviewExams } from "./permissions";
import { isExamAttemptExpired, validateExamAvailabilityWindow } from "./db";

describe("permisos de exámenes", () => {
  it("permite crear exámenes a administración y docentes", () => {
    expect(canManageExams("admin")).toBe(true);
    expect(canManageExams("teacher")).toBe(true);
    expect(canManageExams("student")).toBe(false);
    expect(canManageExams("user")).toBe(false);
  });

  it("permite revisar intentos a administración y docentes, nunca al estudiante", () => {
    expect(canReviewExams("admin")).toBe(true);
    expect(canReviewExams("teacher")).toBe(true);
    expect(canReviewExams("student")).toBe(false);
    expect(canReviewExams("user")).toBe(false);
  });

  it("rechaza envíos posteriores a la duración máxima del intento", () => {
    const startedAt = new Date("2026-09-20T14:00:00.000Z");
    expect(
      isExamAttemptExpired(startedAt, 60, new Date("2026-09-20T14:59:59.000Z"))
    ).toBe(false);
    expect(
      isExamAttemptExpired(startedAt, 60, new Date("2026-09-20T15:00:01.000Z"))
    ).toBe(true);
  });

  it("rechaza una ventana de disponibilidad invertida y acepta una válida", () => {
    const start = new Date("2026-09-20T14:00:00.000Z");
    const end = new Date("2026-09-20T15:00:00.000Z");
    expect(() => validateExamAvailabilityWindow(start, end)).not.toThrow();
    expect(() => validateExamAvailabilityWindow(end, start)).toThrow(
      "posterior"
    );
    expect(() => validateExamAvailabilityWindow(start, null)).not.toThrow();
  });
});
