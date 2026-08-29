import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Landmark, ArrowLeft, KeyRound } from "lucide-react";
import React, { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

type Mode = "login" | "reset-request" | "reset-confirm";

export default function Register() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("resetToken") || "");
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("resetToken") || "";
    if (token) { setResetToken(token); setMode("reset-confirm"); }
  }, []);

  const register = trpc.localAuth.register.useMutation({
    onSuccess: () => { toast.success("Cuenta creada. Bienvenido a WijiEdu."); window.location.href = "/"; },
    onError: error => toast.error(error.message),
  });
  const login = trpc.localAuth.login.useMutation({
    onSuccess: () => { toast.success("Acceso correcto."); window.location.href = "/"; },
    onError: error => toast.error(error.data?.code === "UNAUTHORIZED" ? "Datos incorrectos." : error.message),
  });
  const requestReset = trpc.localAuth.requestPasswordReset.useMutation({
    onSuccess: data => {
      toast.success(data.message);
      setMode("reset-request");
    },
    onError: error => toast.error(error.message),
  });
  const resetPassword = trpc.localAuth.resetPassword.useMutation({
    onSuccess: data => {
      toast.success(data.message);
      setPassword("");
      setMode("login");
      setResetToken("");
      window.history.replaceState({}, "", "/registro");
    },
    onError: error => toast.error(error.message),
  });
  const pending = register.isPending || login.isPending || requestReset.isPending || resetPassword.isPending;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "reset-request") {
      requestReset.mutate({ email });
      return;
    }
    if (mode === "reset-confirm") {
      if (!resetToken) { toast.error("Abre el enlace enviado a tu correo para cambiar la contraseña."); return; }
      resetPassword.mutate({ token: resetToken, password });
      return;
    }
    login.mutate({ email, password });
  }

  const isResetRequest = mode === "reset-request";
  const isResetConfirm = mode === "reset-confirm";
  const title = isResetConfirm ? "Nueva contraseña" : isResetRequest ? "Restablecer acceso" : "Acceso institucional";
  const description = isResetConfirm ? "Define una contraseña nueva para volver al portal." : isResetRequest ? "Indica tu correo y te ayudaremos a recuperar el acceso." : "Ingresa con las credenciales asignadas por la administración académica.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07182B] px-5 py-8 text-[#ECF2F7]">
      <section className="w-full max-w-md rounded-xl border border-[#284761] bg-[#0C2138] p-7 shadow-[0_18px_48px_rgba(0,0,0,.22)] sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-[#B99757] text-[#07182B]">{isResetConfirm ? <KeyRound className="h-7 w-7" /> : <Landmark className="h-7 w-7" />}</div>
          <p className="institutional-kicker">{title}</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">WijiEdu</h1>
          <p className="mt-1 text-sm text-[#9AAFC1]">Sistema de gestión académica</p>
        </div>
        <p className="mb-6 border-y border-[#284761] py-4 text-center text-sm leading-6 text-[#C7D4DE]">{description}</p>
        <form className="space-y-4" onSubmit={submit}>
          {(mode === "login" || isResetRequest) && <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8898AA]">Correo electrónico</span><input required type="email" autoComplete="email" className="wij-input" value={email} onChange={event => setEmail(event.target.value)} placeholder="nombre@correo.com" /></label>}
          {isResetConfirm && <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8898AA]">Nueva contraseña</span><input required type="password" minLength={8} autoComplete="new-password" className="wij-input" value={password} onChange={event => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" /></label>}
          {mode === "login" && <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8898AA]">Contraseña</span><input required type="password" minLength={1} autoComplete="current-password" className="wij-input" value={password} onChange={event => setPassword(event.target.value)} placeholder="Tu contraseña" /></label>}
          <Button type="submit" disabled={pending} className="mt-2 w-full bg-[#B99757] py-5 font-semibold text-[#07182B] hover:bg-[#C9AA68]">{pending ? "Procesando…" : isResetConfirm ? "Guardar nueva contraseña" : isResetRequest ? "Solicitar recuperación" : "Ingresar al portal"}</Button>
        </form>
        <div className="mt-5 flex flex-col items-center gap-2 text-center text-xs leading-5 text-[#9AAFC1]">
          {mode === "login" && <button type="button" className="font-semibold text-[#D3B56D] underline-offset-4 hover:underline" onClick={() => setMode("reset-request")}>¿Olvidaste tu contraseña?</button>}
          {mode !== "login" && <button type="button" className="inline-flex items-center gap-1 font-semibold text-[#D3B56D] underline-offset-4 hover:underline" onClick={() => { setMode("login"); setPassword(""); window.history.replaceState({}, "", "/registro"); }}><ArrowLeft className="h-3.5 w-3.5" /> Volver al acceso</button>}
          {mode === "login" && <span>Para asistencia con tu cuenta, comunícate con la administración de la institución.</span>}
        </div>
      </section>
    </main>
  );
}
