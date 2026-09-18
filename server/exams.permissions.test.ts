import { describe, expect, it } from "vitest";
import {
  canManageExams,
  canReviewExams,
  hasValidExamChoiceOptions,
} from "./permissions";
import { distributeExamQuestionTypes } from "./routers";
import {
  isExamAttemptExpired,
  normalizedExamAnswer,
  validateExamAvailabilityWindow,
} from "./db";

describe("permisos de exámenes", () => {
  it("permite crear exámenes a administración y docentes", () => {
    expect(canManageExams("admin")).toBe(true);
    expect(canManageExams("teacher")).toBe(true);
    expect(canManageExams("student")).toBe(false);
    expect(canManageExams("user")).toBe(false);
  });

  it("distribuye exactamente los tipos elegidos sin convertirlos a opción múltiple", () => {
    expect(distributeExamQuestionTypes(4, ["true_false"])).toEqual([
      "true_false",
      "true_false",
      "true_false",
      "true_false",
    ]);
    expect(distributeExamQuestionTypes(5, ["true_false", "open"])).toEqual([
      "true_false",
      "open",
      "true_false",
      "open",
      "true_false",
    ]);
    expect(
      distributeExamQuestionTypes(3, ["open", "multiple_choice", "ordering"])
    ).toEqual(["open", "multiple_choice", "ordering"]);
  });

  it("califica correctamente selección múltiple y valida respuestas A-D", () => {
    const options = ["A", "B", "C", "D"];
    expect(hasValidExamChoiceOptions(options, ["A", "C"])).toBe(true);
    expect(hasValidExamChoiceOptions(options, ["A", "E"])).toBe(false);
    expect(normalizedExamAnswer("multiple_choice", "C||A")).toBe(
      normalizedExamAnswer("multiple_choice", ["A", "C"])
    );
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
