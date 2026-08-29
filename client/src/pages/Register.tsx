import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Landmark } from "lucide-react";
import React, { FormEvent, useState } from "react";
import { toast } from "sonner";

type Mode = "login" | "recovery";

export default function Register() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const login = trpc.localAuth.login.useMutation({
    onSuccess: () => { toast.success("Acceso correcto."); window.location.href = "/"; },
    onError: error => toast.error(error.data?.code === "UNAUTHORIZED" ? "Datos incorrectos." : error.message),
  });
  const requestRecovery = trpc.localAuth.requestPasswordReset.useMutation({
    onSuccess: data => { setSubmitted(true); toast.success(data.message); },
    onError: error => toast.error(error.message),
  });
  const pending = login.isPending || requestRecovery.isPending;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "recovery") { requestRecovery.mutate({ email }); return; }
    login.mutate({ email, password });
  }

  const isRecovery = mode === "recovery";
  const title = isRecovery ? "Solicitar recuperación" : "Acceso institucional";
  const description = isRecovery ? "El administrador de tu institución revisará la solicitud y te dará respuesta en menos de 24 horas." : "Ingresa con las credenciales asignadas por la administración académica.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07182B] px-5 py-8 text-[#ECF2F7]">
      <section className="w-full max-w-md rounded-xl border border-[#284761] bg-[#0C2138] p-7 shadow-[0_18px_48px_rgba(0,0,0,.22)] sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-[#B99757] text-[#07182B]"><Landmark className="h-7 w-7" /></div>
          <p className="institutional-kicker">{title}</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">WijiEdu</h1>
          <p className="mt-1 text-sm text-[#9AAFC1]">Sistema de gestión académica</p>
        </div>
        <p className="mb-6 border-y border-[#284761] py-4 text-center text-sm leading-6 text-[#C7D4DE]">{description}</p>
        {isRecovery && submitted && <div className="mb-5 rounded-lg border border-[#B99757]/40 bg-[#B99757]/10 p-4 text-sm leading-6 text-[#E8D9B1]">Tu solicitud fue enviada al administrador de tu institución. En menos de 24 horas recibirás respuesta por el canal institucional habilitado.</div>}
        <form className="space-y-4" onSubmit={submit}>
          <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8898AA]">Correo electrónico</span><input required type="email" autoComplete="email" className="wij-input" value={email} onChange={event => setEmail(event.target.value)} placeholder="nombre@correo.com" /></label>
          {!isRecovery && <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8898AA]">Contraseña</span><input required type="password" minLength={1} autoComplete="current-password" className="wij-input" value={password} onChange={event => setPassword(event.target.value)} placeholder="Tu contraseña" /></label>}
          <Button type="submit" disabled={pending} className="mt-2 w-full bg-[#B99757] py-5 font-semibold text-[#07182B] hover:bg-[#C9AA68]">{pending ? "Procesando…" : isRecovery ? "Enviar solicitud" : "Ingresar al portal"}</Button>
        </form>
        <div className="mt-5 flex flex-col items-center gap-2 text-center text-xs leading-5 text-[#9AAFC1]">
          {!isRecovery && <button type="button" className="font-semibold text-[#D3B56D] underline-offset-4 hover:underline" onClick={() => { setMode("recovery"); setSubmitted(false); }}>¿Necesitas cambiar tu contraseña?</button>}
          {isRecovery && <button type="button" className="inline-flex items-center gap-1 font-semibold text-[#D3B56D] underline-offset-4 hover:underline" onClick={() => { setMode("login"); setSubmitted(false); }}><ArrowLeft className="h-3.5 w-3.5" /> Volver al acceso</button>}
          {!isRecovery && <span>Para asistencia con tu cuenta, comunícate con la administración de la institución.</span>}
        </div>
      </section>
    </main>
  );
}
