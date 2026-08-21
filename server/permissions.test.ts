import { describe, expect, it } from "vitest";
import { canManageAcademicContent, normaliseAcademicRole } from "./permissions";

describe("permisos académicos", () => {
  it("normaliza el rol interno user como estudiante", () => {
    expect(normaliseAcademicRole("user")).toBe("student");
    expect(normaliseAcademicRole("teacher")).toBe("teacher");
  });

  it("solo habilita la gestión de contenido a administrador y docente", () => {
    expect(canManageAcademicContent("admin")).toBe(true);
    expect(canManageAcademicContent("teacher")).toBe(true);
    expect(canManageAcademicContent("student")).toBe(false);
    expect(canManageAcademicContent("user")).toBe(false);
  });
});
