import { ENV } from "./_core/env";

export async function sendPasswordResetEmail(input: { to: string; token: string }) {
  if (!ENV.resendApiKey || !ENV.emailFrom || !ENV.appBaseUrl) {
    throw new Error("La configuración de correo de recuperación está incompleta.");
  }
  const resetUrl = `${ENV.appBaseUrl.replace(/\/$/, "")}/registro?resetToken=${encodeURIComponent(input.token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: ENV.emailFrom,
      to: [input.to],
      subject: "Restablece tu contraseña de WijiEdu",
      text: `Recibimos una solicitud para cambiar tu contraseña de WijiEdu. Usa este enlace dentro de 30 minutos: ${resetUrl}\n\nSi no solicitaste este cambio, ignora este correo.`,
      html: `<p>Recibimos una solicitud para cambiar tu contraseña de WijiEdu.</p><p><a href="${resetUrl}">Cambiar contraseña</a></p><p>El enlace vence en 30 minutos y solo puede utilizarse una vez. Si no solicitaste este cambio, ignora este correo.</p>`,
    }),
  });
  if (!response.ok) throw new Error(`El proveedor de correo respondió ${response.status}.`);
}
