import { describe, expect, it } from "vitest";
import { canReviewExams, hasValidExamChoiceOptions, isAllowedExamRecordingMime } from "./permissions";

describe("grabaciones de exámenes", () => {
  it("acepta únicamente formatos audiovisuales permitidos", () => {
    expect(isAllowedExamRecordingMime("video/webm")).toBe(true);
    expect(isAllowedExamRecordingMime("video/mp4")).toBe(true);
    expect(isAllowedExamRecordingMime("application/pdf")).toBe(false);
    expect(isAllowedExamRecordingMime("text/plain")).toBe(false);
  });

  it("exige cuatro opciones distintas y una respuesta correcta", () => {
    const options = ["A. Primera", "B. Segunda", "C. Tercera", "D. Cuarta"];
    expect(hasValidExamChoiceOptions(options, options[0])).toBe(true);
    expect(hasValidExamChoiceOptions(options.slice(0, 3), options[0])).toBe(false);
    expect(hasValidExamChoiceOptions(["A", "A", "C", "D"], "A")).toBe(false);
    expect(hasValidExamChoiceOptions(options, "E. Otra")).toBe(false);
  });

  it("mantiene la revisión restringida a administración y docentes", () => {
    expect(canReviewExams("admin")).toBe(true);
    expect(canReviewExams("teacher")).toBe(true);
    expect(canReviewExams("student")).toBe(false);
  });
});
