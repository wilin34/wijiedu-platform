export type AcademicRole = "admin" | "teacher" | "student" | "user";

export function normaliseAcademicRole(role: AcademicRole): "admin" | "teacher" | "student" {
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
