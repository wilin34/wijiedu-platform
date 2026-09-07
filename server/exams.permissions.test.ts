import { describe, expect, it } from "vitest";
import { canManageExams, canReviewExams } from "./permissions";

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
});
