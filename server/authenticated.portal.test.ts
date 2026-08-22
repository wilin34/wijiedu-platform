import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = {
  listSubjectsForUser: vi.fn(async () => [{ id: 1, code: "FIN-101", name: "Fundamentos de Finanzas", period: "2026-1" }]),
  listUsers: vi.fn(async () => [{ id: 1, name: "Administrador", email: "admin@wijiedu.test", role: "admin" }]),
  canAccessSubject: vi.fn(async () => true),
  listCourseResources: vi.fn(async () => [{ id: 1, subjectId: 1, title: "Guía de presupuesto personal", resourceType: "reading" }]),
};

vi.mock("./db", () => dbMocks);
vi.mock("./storage", () => ({ storagePut: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));

const { appRouter } = await import("./routers");

function authenticatedAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "local_admin_session",
      name: "Administrador",
      email: "admin@wijiedu.test",
      loginMethod: "local",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("portal autenticado", () => {
  it("permite a una sesión administrativa consultar materias, usuarios y recursos internos", async () => {
    const caller = appRouter.createCaller(authenticatedAdminContext());

    await expect(caller.auth.me()).resolves.toMatchObject({ role: "admin", email: "admin@wijiedu.test" });
    await expect(caller.academic.subjects.list()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ code: "FIN-101" })]));
    await expect(caller.academic.users.list()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ email: "admin@wijiedu.test" })]));
    await expect(caller.academic.curriculum.resources({ subjectId: 1 })).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ title: "Guía de presupuesto personal" })]));

    expect(dbMocks.canAccessSubject).toHaveBeenCalledWith(expect.objectContaining({ role: "admin" }), 1);
  });
});
