import { describe, expect, it } from "vitest";
import { canReviewExams, isAllowedExamRecordingMime } from "./permissions";

describe("grabaciones de exámenes", () => {
  it("acepta únicamente formatos audiovisuales permitidos", () => {
    expect(isAllowedExamRecordingMime("video/webm")).toBe(true);
    expect(isAllowedExamRecordingMime("video/mp4")).toBe(true);
    expect(isAllowedExamRecordingMime("application/pdf")).toBe(false);
    expect(isAllowedExamRecordingMime("text/plain")).toBe(false);
  });

  it("mantiene la revisión restringida a administración y docentes", () => {
    expect(canReviewExams("admin")).toBe(true);
    expect(canReviewExams("teacher")).toBe(true);
    expect(canReviewExams("student")).toBe(false);
  });
});
