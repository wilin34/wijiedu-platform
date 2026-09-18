export type AcademicRole = "admin" | "teacher" | "student" | "user";

export function normaliseAcademicRole(
  role: AcademicRole
): "admin" | "teacher" | "student" {
  return role === "user" ? "student" : role;
}

export function canManageAcademicContent(role: AcademicRole) {
  const normalised = normaliseAcademicRole(role);
  return normalised === "admin" || normalised === "teacher";
}

export function canManageCommercial(role: AcademicRole) {
  return normaliseAcademicRole(role) === "admin";
}

export function canReviewAdmissions(role: AcademicRole) {
  return normaliseAcademicRole(role) === "admin";
}

export function canManageExams(role: AcademicRole) {
  const normalised = normaliseAcademicRole(role);
  return normalised === "admin" || normalised === "teacher";
}

export function hasValidExamChoiceOptions(
  options: unknown,
  correctAnswer: unknown
) {
  if (!Array.isArray(options) || options.length !== 4) return false;
  const normalizedOptions = options.map(String);
  if (new Set(normalizedOptions).size !== 4) return false;
  if (typeof correctAnswer === "string")
    return normalizedOptions.includes(correctAnswer);
  return (
    Array.isArray(correctAnswer) &&
    correctAnswer.length > 0 &&
    correctAnswer.every(
      item => typeof item === "string" && normalizedOptions.includes(item)
    )
  );
}

export function isAllowedExamRecordingMime(mimeType: string) {
  return ["video/webm", "video/mp4", "audio/webm", "audio/mp4"].includes(
    mimeType
  );
}

export function canReviewExams(role: AcademicRole) {
  const normalised = normaliseAcademicRole(role);
  return normalised === "admin" || normalised === "teacher";
}
