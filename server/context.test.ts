import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticateRequest: vi.fn() }));

vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: mocks.authenticateRequest },
}));

const { createContext } = await import("./_core/context");

describe("createContext", () => {
  it("limpia una sesión inválida y permite que la vista pública continúe", async () => {
    mocks.authenticateRequest.mockRejectedValueOnce(new Error("firma inválida"));
    const clearCookie = vi.fn();
    const ctx = await createContext({
      req: { protocol: "https", headers: {} } as never,
      res: { clearCookie } as never,
      info: {} as never,
    });

    expect(ctx.user).toBeNull();
    expect(clearCookie).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ maxAge: -1, path: "/", secure: true })
    );
  });
});
