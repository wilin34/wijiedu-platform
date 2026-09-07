import { describe, expect, it } from "vitest";
import { canManageCommercial, canReviewAdmissions } from "./permissions";

describe("permisos de gestión comercial", () => {
  it("solo permite prospectos y conversiones a la administración institucional", () => {
    expect(canManageCommercial("admin")).toBe(true);
    expect(canManageCommercial("teacher")).toBe(false);
    expect(canManageCommercial("student")).toBe(false);
    expect(canManageCommercial("user")).toBe(false);
  });

  it("reserva la revisión de admisiones a administración", () => {
    expect(canReviewAdmissions("admin")).toBe(true);
    expect(canReviewAdmissions("teacher")).toBe(false);
    expect(canReviewAdmissions("student")).toBe(false);
  });
});
