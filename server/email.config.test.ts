import { describe, expect, it } from "vitest";

describe("configuración de correo de recuperación", () => {
  it.skipIf(process.env.RUN_LIVE_EMAIL_TEST !== "1")("acepta la clave de Resend configurada", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey, "RESEND_API_KEY debe estar configurada").toBeTruthy();
    const response = await fetch("https://api.resend.com/domains?limit=1", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(response.ok, `Resend respondió ${response.status}`).toBe(true);
  }, 15000);
});
