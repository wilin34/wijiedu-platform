import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  createLocalUser: vi.fn(),
  updateLastSignedIn: vi.fn(),
  createLocalSession: vi.fn(async () => "local-session-token"),
  getInstitutionForUser: vi.fn(async () => 1),
  createRecoveryRequest: vi.fn(async () => ({ id: 44, institutionId: 1, userId: 15, status: "pending" })),
  listInstitutionAdmins: vi.fn(async () => [{ id: 21, name: "Admin", email: "admin@test.local", role: "admin" }]),
  createNotification: vi.fn(),
  getUserById: vi.fn(),
  completeRequiredPasswordChange: vi.fn(),
}));

vi.mock("./db", () => ({
  getUserByEmail: mocks.getUserByEmail,
  createLocalUser: mocks.createLocalUser,
  updateLastSignedIn: mocks.updateLastSignedIn,
  getInstitutionForUser: mocks.getInstitutionForUser,
  createRecoveryRequest: mocks.createRecoveryRequest,
  listInstitutionAdmins: mocks.listInstitutionAdmins,
  createNotification: mocks.createNotification,
  getUserById: mocks.getUserById,
  completeRequiredPasswordChange: mocks.completeRequiredPasswordChange,
}));
vi.mock("./_core/localSession", () => ({ createLocalSession: mocks.createLocalSession }));

const { appRouter } = await import("./routers");

const localUser = {
  id: 15,
  openId: "local_test",
  name: "Cuenta Local",
  email: "cuenta@wijiedu.test",
  loginMethod: "local",
  passwordHash: "scrypt$abc$1a",
  role: "student" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function context() {
  const cookie = vi.fn();
  const clearCookie = vi.fn();
  return {
    ctx: { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { cookie, clearCookie } as TrpcContext["res"] },
    cookie,
  };
}

describe("localAuth", () => {
  it("no expone el hash de contraseña al consultar la sesión", async () => {
    const { ctx } = context();
    ctx.user = localUser;

    const result = await appRouter.createCaller(ctx).auth.me();

    expect(result).toMatchObject({ id: 15, email: "cuenta@wijiedu.test" });
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("registra una cuenta local y crea una sesión de siete días", async () => {
    mocks.getUserByEmail.mockResolvedValueOnce(undefined);
    mocks.createLocalUser.mockResolvedValueOnce(localUser);
    const { ctx, cookie } = context();

    const result = await appRouter.createCaller(ctx).localAuth.register({ name: "Cuenta Local", email: "cuenta@wijiedu.test", password: "segura123" });

    expect(mocks.createLocalUser).toHaveBeenCalledWith(expect.objectContaining({ name: "Cuenta Local", email: "cuenta@wijiedu.test", passwordHash: expect.stringMatching(/^scrypt\$/) }));
    expect(cookie).toHaveBeenCalledWith(expect.any(String), "local-session-token", expect.objectContaining({ httpOnly: true, maxAge: 604800000 }));
    expect(result).toMatchObject({ id: 15, email: "cuenta@wijiedu.test", role: "student" });
  });

  it("rechaza el ingreso cuando la contraseña no coincide", async () => {
    mocks.getUserByEmail.mockResolvedValueOnce({ ...localUser, passwordHash: "scrypt$abc$0011" });
    const { ctx } = context();

    await expect(appRouter.createCaller(ctx).localAuth.login({ email: "cuenta@wijiedu.test", password: "incorrecta" })).rejects.toMatchObject({ code: "UNAUTHORIZED", message: "Datos incorrectos." });
  });

  it("crea una solicitud supervisada y notifica al administrador institucional", async () => {
    mocks.getUserByEmail.mockResolvedValueOnce(localUser);
    const result = await appRouter.createCaller(context().ctx).localAuth.requestPasswordReset({ email: localUser.email! });
    expect(result.message).toContain("administrador de tu institución");
    expect(mocks.createRecoveryRequest).toHaveBeenCalledWith({ institutionId: 1, userId: 15 });
    expect(mocks.createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 21, institutionId: 1, type: "system", href: "/?view=users&requestId=44" }));
  });

  it("mantiene el mismo mensaje para un correo desconocido", async () => {
    mocks.getUserByEmail.mockResolvedValueOnce(undefined);
    const result = await appRouter.createCaller(context().ctx).localAuth.requestPasswordReset({ email: "no-existe@wijiedu.test" });
    expect(result.message).toContain("administrador de tu institución");
  });

  it("rechaza el cambio protegido sin la contraseña temporal correcta", async () => {
    mocks.getUserById.mockResolvedValueOnce({ ...localUser, passwordHash: "scrypt$abc$0011" });
    const { ctx } = context();
    ctx.user = localUser;
    await expect(appRouter.createCaller(ctx).localAuth.changePassword({ currentPassword: "incorrecta", newPassword: "NuevaSegura123" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
