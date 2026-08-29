import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";

const mocks = vi.hoisted(() => ({
  listInstitutionsForUser: vi.fn(async (userId: number) => userId === 7 ? [{ id: 1, name: "Institución A", slug: "institucion-a", role: "admin" }] : []),
  listInstitutions: vi.fn(async () => [{ id: 1, name: "Institución A", slug: "institucion-a", status: "active" }]),
  createInstitution: vi.fn(async () => 2),
  addInstitutionMembership: vi.fn(),
}));

vi.mock("./db", () => mocks);
const { appRouter } = await import("./routers");

function context(role: "admin" | "student" = "student", owner = false) {
  return {
    user: { id: 7, openId: owner ? ENV.ownerOpenId : "institution-admin", name: "Usuario", email: "usuario@test.local", role } as TrpcContext["user"],
    institutionId: 1,
    req: { protocol: "https", headers: {}, cookies: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("institutions", () => {
  it("solo devuelve los espacios asociados al usuario autenticado", async () => {
    const result = await appRouter.createCaller(context()).institutions.mine();
    expect(result).toEqual([{ id: 1, name: "Institución A", slug: "institucion-a", role: "admin" }]);
    expect(mocks.listInstitutionsForUser).toHaveBeenCalledWith(7);
  });

  it("reserva la gestión global a administración", async () => {
    const student = appRouter.createCaller(context("student"));
    await expect(student.institutions.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(student.institutions.create({ name: "Institución B", slug: "institucion-b" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const admin = appRouter.createCaller(context("admin", true));
    await expect(admin.institutions.create({ name: "Institución B", slug: "institucion-b" })).resolves.toEqual({ id: 2 });
    await expect(admin.institutions.addMember({ institutionId: 2, userId: 9, role: "teacher" })).resolves.toEqual({ success: true });
    expect(mocks.addInstitutionMembership).toHaveBeenCalledWith({ institutionId: 2, userId: 9, role: "teacher" });
  });
});
