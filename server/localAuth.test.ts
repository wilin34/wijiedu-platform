import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  createLocalUser: vi.fn(),
  updateLastSignedIn: vi.fn(),
  createLocalSession: vi.fn(async () => "local-session-token"),
  createPasswordResetToken: vi.fn(),
  getValidPasswordResetToken: vi.fn(),
  updateAccountPassword: vi.fn(),
  markPasswordResetTokenUsed: vi.fn(),
  sendPasswordResetEmail: vi.fn(async () => undefined),
}));

vi.mock("./db", () => ({
  getUserByEmail: mocks.getUserByEmail,
  createLocalUser: mocks.createLocalUser,
  updateLastSignedIn: mocks.updateLastSignedIn,
  createPasswordResetToken: mocks.createPasswordResetToken,
  getValidPasswordResetToken: mocks.getValidPasswordResetToken,
  updateAccountPassword: mocks.updateAccountPassword,
  markPasswordResetTokenUsed: mocks.markPasswordResetTokenUsed,
}));
vi.mock("./_core/localSession", () => ({ createLocalSession: mocks.createLocalSession }));
vi.mock("./email", () => ({ sendPasswordResetEmail: mocks.sendPasswordResetEmail }));

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

  it("genera un token de recuperación sin enumerar cuentas", async () => {
    mocks.getUserByEmail.mockResolvedValueOnce(localUser);
    const caller = appRouter.createCaller(context().ctx);
    const result = await caller.localAuth.requestPasswordReset({ email: localUser.email! });

    expect(result.message).toContain("Si el correo corresponde");
    expect(result).toEqual({ message: result.message });
    expect(mocks.createPasswordResetToken).toHaveBeenCalledWith(15, expect.any(String), expect.any(Date));
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(expect.objectContaining({ to: localUser.email, token: expect.any(String) }));

    mocks.getUserByEmail.mockResolvedValueOnce(undefined);
    const unknown = await caller.localAuth.requestPasswordReset({ email: "no-existe@wijiedu.test" });
    expect(unknown).toEqual({ message: result.message });
  });

  it("cambia la contraseña, incrementa la sesión y consume el token", async () => {
    mocks.getValidPasswordResetToken.mockResolvedValueOnce({ id: 44, userId: 15, expiresAt: new Date(Date.now() + 60_000), usedAt: null });
    const { ctx } = context();
    const result = await appRouter.createCaller(ctx).localAuth.resetPassword({ token: "token-de-prueba-12345678901234567890", password: "NuevaSegura123" });

    expect(result.success).toBe(true);
    expect(mocks.updateAccountPassword).toHaveBeenCalledWith(15, expect.stringMatching(/^scrypt\$/));
    expect(mocks.markPasswordResetTokenUsed).toHaveBeenCalledWith(44);
  });

  it("rechaza el cambio de contraseña si no se presenta el token del correo", async () => {
    mocks.updateAccountPassword.mockClear();
    await expect(appRouter.createCaller(context().ctx).localAuth.resetPassword({ token: "", password: "NuevaSegura123" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.updateAccountPassword).not.toHaveBeenCalled();
  });

  it("rechaza tokens de recuperación expirados", async () => {
    mocks.getValidPasswordResetToken.mockResolvedValueOnce({ id: 45, userId: 15, expiresAt: new Date(Date.now() - 1), usedAt: null });
    const { ctx } = context();
    await expect(appRouter.createCaller(ctx).localAuth.resetPassword({ token: "token-de-prueba-12345678901234567890", password: "NuevaSegura123" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
