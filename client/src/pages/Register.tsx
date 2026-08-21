import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import React, { FormEvent, useState } from "react";
import { toast } from "sonner";

type Mode = "register" | "login";

export default function Register() {
  const [mode, setMode] = useState<Mode>("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const register = trpc.localAuth.register.useMutation({
    onSuccess: () => {
      toast.success("Cuenta creada. Bienvenido a WijiEdu.");
      window.location.href = "/";
    },
    onError: error => toast.error(error.message),
  });
  const login = trpc.localAuth.login.useMutation({
    onSuccess: () => {
      toast.success("Acceso correcto.");
      window.location.href = "/";
    },
    onError: error => toast.error(error.message),
  });
  const pending = register.isPending || login.isPending;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "register") {
      if (password.length < 8) {
        toast.error("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
      register.mutate({ name, email, password });
      return;
    }
    login.mutate({ email, password });
  }

  const isRegister = mode === "register";
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A1628] px-5 py-8 text-[#E2E8F0]">
      <section className="w-full max-w-md rounded-[20px] border border-[#243356] bg-[#111E35] p-7 shadow-2xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F8EF7] to-[#7C3AED] text-3xl">🎓</div>
          <h1 className="font-display text-3xl font-extrabold text-white">WijiEdu</h1>
          <p className="mt-1 text-sm text-[#8898AA]">Tu espacio académico en un solo lugar</p>
        </div>
        <div className="mb-6 grid grid-cols-2 rounded-xl bg-[#162040] p-1">
          <button type="button" onClick={() => setMode("register")} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${isRegister ? "bg-[#1C2A4A] text-white shadow" : "text-[#8898AA] hover:text-white"}`}>Registrarme</button>
          <button type="button" onClick={() => setMode("login")} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${!isRegister ? "bg-[#1C2A4A] text-white shadow" : "text-[#8898AA] hover:text-white"}`}>Entrar</button>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          {isRegister && <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8898AA]">Nombre completo</span><input required autoComplete="name" className="wij-input" value={name} onChange={event => setName(event.target.value)} placeholder="Tu nombre" /></label>}
          <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8898AA]">Correo electrónico</span><input required type="email" autoComplete="email" className="wij-input" value={email} onChange={event => setEmail(event.target.value)} placeholder="nombre@correo.com" /></label>
          <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8898AA]">Contraseña</span><input required type="password" minLength={isRegister ? 8 : 1} autoComplete={isRegister ? "new-password" : "current-password"} className="wij-input" value={password} onChange={event => setPassword(event.target.value)} placeholder={isRegister ? "Mínimo 8 caracteres" : "Tu contraseña"} /></label>
          <Button type="submit" disabled={pending} className="mt-2 w-full bg-[#4F8EF7] py-5 font-semibold hover:bg-[#3A7AE8]">{pending ? "Procesando…" : isRegister ? "Crear mi cuenta" : "Entrar a WijiEdu"}</Button>
        </form>
        <p className="mt-5 text-center text-xs leading-5 text-[#8898AA]">{isRegister ? "Al crear tu cuenta, podrás acceder como estudiante y el administrador podrá asignarte materias." : "Usa el correo y la contraseña con los que te registraste."}</p>
      </section>
    </main>
  );
}
