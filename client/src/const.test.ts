import { afterEach, describe, expect, it, vi } from "vitest";
import { clearStaleClientSession, startLogin } from "./const";

const originalDocument = globalThis.document;
const originalSessionStorage = globalThis.sessionStorage;
const originalWindow = globalThis.window;
const originalCrypto = globalThis.crypto;

afterEach(() => {
  Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: originalSessionStorage });
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto });
  vi.unstubAllEnvs();
});

describe("acceso de WijiEdu", () => {
  it("elimina el token local y expira la cookie de una sesión vencida", () => {
    const removeItem = vi.fn();
    const documentStub = { cookie: "" };
    Object.defineProperty(globalThis, "document", { configurable: true, value: documentStub });
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { removeItem } });

    clearStaleClientSession();

    expect(removeItem).toHaveBeenCalledWith("manus-cookie");
    expect(documentStub.cookie).toContain("Max-Age=0");
  });

  it("inicia el registro seguro con estado y nonce vinculados al navegador", () => {
    const documentStub = { cookie: "" };
    const location = { origin: "https://wijiedu.test", href: "" };
    Object.defineProperty(globalThis, "document", { configurable: true, value: documentStub });
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { removeItem: vi.fn() } });
    Object.defineProperty(globalThis, "window", { configurable: true, value: { location } });
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: { randomUUID: () => "fixed-nonce" } });
    vi.stubEnv("VITE_OAUTH_PORTAL_URL", "https://access.example.test");
    vi.stubEnv("VITE_APP_ID", "wijiedu-app");

    startLogin();

    expect(documentStub.cookie).toContain("fixed-nonce");
    expect(location.href).toContain("https://access.example.test/app-auth");
    expect(location.href).toContain("appId=wijiedu-app");
    expect(location.href).toContain("redirectUri=https%3A%2F%2Fwijiedu.test%2Fapi%2Foauth%2Fcallback");
  });
});
