import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";

const mocks = vi.hoisted(() => ({
  listInstitutionsForUser: vi.fn(async (userId: number) => userId === 7 ? [{ id: 1, name: "Institución A", slug: "institucion-a", role: "admin" }] : []),
  listInstitutions: vi.fn(async () => [{ id: 1, name: "Institución A", slug: "institucion-a", status: "active" }]),
  createInstitution: vi.fn(async () => 2),
  updateInstitutionBranding: vi.fn(),
  storagePut: vi.fn(async () => ({ key: "institutions/logos/logo.png", url: "/manus-storage/institutions/logos/logo.png" })),
  deleteInstitution: vi.fn(async (institutionId: number) => { if (institutionId === 1) throw new Error("La institución principal no se puede eliminar."); return { success: true }; }),
  addInstitutionMembership: vi.fn(),
  getUserByEmail: vi.fn(async () => undefined),
  createLocalUser: vi.fn(async () => ({ id: 12, name: "Admin Institucional", email: "admin@institucion.test", role: "admin" })),
}));

vi.mock("./db", () => mocks);
vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));
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

  it("reconoce a wilinton@gmail.com como propietario local de la plataforma", async () => {
    const localOwner = appRouter.createCaller({ ...context("admin"), user: { ...context("admin").user, email: "wilinton@gmail.com", role: "admin" } });
    await expect(localOwner.institutions.list()).resolves.toHaveLength(1);
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

  it("guarda logo y paleta al crear una institución", async () => {
    const owner = appRouter.createCaller(context("admin", true));
    await expect(owner.institutions.create({ name: "Institución Visual", slug: "institucion-visual", logoBase64: "aGVsbG8=", logoFileName: "marca.png", logoMimeType: "image/png", primaryColor: "#123456", secondaryColor: "#0A0B0C" })).resolves.toEqual({ id: 2 });
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringContaining("institutions/logos/"), expect.any(Buffer), "image/png");
    expect(mocks.createInstitution).toHaveBeenCalledWith({ name: "Institución Visual", slug: "institucion-visual", logoUrl: "/manus-storage/institutions/logos/logo.png", primaryColor: "#123456", secondaryColor: "#0A0B0C" });
  });

  it("solo permite al propietario eliminar instituciones creadas y protege la principal", async () => {
    const institutionalAdmin = appRouter.createCaller(context("admin"));
    await expect(institutionalAdmin.institutions.remove({ institutionId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const owner = appRouter.createCaller(context("admin", true));
    await expect(owner.institutions.remove({ institutionId: 1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(owner.institutions.remove({ institutionId: 2 })).resolves.toEqual({ success: true });
    expect(mocks.deleteInstitution).toHaveBeenCalledWith(2);
  });

  it("permite al propietario crear un administrador institucional con credenciales locales", async () => {
    const owner = appRouter.createCaller(context("admin", true));
    await expect(owner.institutions.createAdmin({ institutionId: 2, name: "Admin Colegio", email: "admin@colegio.test", password: "Segura123" })).resolves.toEqual({ id: 12, created: true });
    expect(mocks.createLocalUser).toHaveBeenCalledWith(expect.objectContaining({ institutionId: 2, role: "admin", email: "admin@colegio.test", passwordHash: expect.stringMatching(/^scrypt\$/) }));
  });

  it("asigna una cuenta existente sin cambiarla de institución global", async () => {
    mocks.getUserByEmail.mockResolvedValueOnce({ id: 44, name: "Cuenta existente", email: "existente@test.local", role: "teacher" });
    const owner = appRouter.createCaller(context("admin", true));
    await expect(owner.institutions.createAdmin({ institutionId: 2, name: "Cuenta existente", email: "existente@test.local", password: "Segura123" })).resolves.toEqual({ id: 44, created: false });
    expect(mocks.addInstitutionMembership).toHaveBeenCalledWith({ institutionId: 2, userId: 44, role: "admin" });
  });
});
