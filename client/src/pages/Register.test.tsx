import { renderToStaticMarkup } from "react-dom/server";
import React, { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route, Router, Switch } from "wouter";
import Register from "./Register";

vi.mock("@/const", () => ({ startLogin: vi.fn() }));

const originalSessionStorage = globalThis.sessionStorage;

afterEach(() => {
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: originalSessionStorage });
});

describe("ruta pública de registro", () => {
  it("se renderiza sin depender de una sesión académica válida", () => {
    const markup = renderToStaticMarkup(createElement(Register));

    expect(markup).toContain("Regístrate gratis");
    expect(markup).toContain("¿Ya tienes una cuenta? Acceder");
    expect(markup).toContain("WijiEdu");
  });

  it("está disponible directamente en /registro sin consultar autenticación", () => {
    const locationHook = (): [string, (path: string) => void] => ["/registro", () => undefined];
    const routes = createElement(Switch, null, createElement(Route, { path: "/registro", component: Register }));
    const markup = renderToStaticMarkup(
      createElement(
        Router,
        { hook: locationHook, children: routes }
      )
    );

    expect(markup).toContain("Regístrate gratis");
  });

  it("permanece disponible en /registro cuando existe una sesión local inválida", () => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: { getItem: vi.fn(() => "manus_session=credencial-inválida") },
    });
    const locationHook = (): [string, (path: string) => void] => ["/registro", () => undefined];
    const routes = createElement(Switch, null, createElement(Route, { path: "/registro", component: Register }));

    expect(() => renderToStaticMarkup(createElement(Router, { hook: locationHook, children: routes }))).not.toThrow();
  });
});
