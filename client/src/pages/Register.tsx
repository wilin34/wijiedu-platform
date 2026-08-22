import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Landmark } from "lucide-react";
import React, { FormEvent, useState } from "react";
import { toast } from "sonner";

type Mode = "register" | "login";

export default function Register() {
  const [mode] = useState<Mode>("login");
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
    <main className="flex min-h-screen items-center justify-center bg-[#07182B] px-5 py-8 text-[#ECF2F7]">
      <section className="w-full max-w-md rounded-xl border border-[#284761] bg-[#0C2138] p-7 shadow-[0_18px_48px_rgba(0,0,0,.22)] sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-[#B99757] text-[#07182B]"><Landmark className="h-7 w-7" /></div>
          <p className="institutional-kicker">Acceso institucional</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">WijiEdu</h1>
          <p className="mt-1 text-sm text-[#9AAFC1]">Sistema de gestión académica</p>
        </div>
        <p className="mb-6 border-y border-[#284761] py-4 text-center text-sm leading-6 text-[#C7D4DE]">Ingresa con las credenciales asignadas por la administración académica.</p>
        <form className="space-y-4" onSubmit={submit}>
          {isRegister && <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8898AA]">Nombre completo</span><input required autoComplete="name" className="wij-input" value={name} onChange={event => setName(event.target.value)} placeholder="Tu nombre" /></label>}
          <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8898AA]">Correo electrónico</span><input required type="email" autoComplete="email" className="wij-input" value={email} onChange={event => setEmail(event.target.value)} placeholder="nombre@correo.com" /></label>
          <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8898AA]">Contraseña</span><input required type="password" minLength={isRegister ? 8 : 1} autoComplete={isRegister ? "new-password" : "current-password"} className="wij-input" value={password} onChange={event => setPassword(event.target.value)} placeholder={isRegister ? "Mínimo 8 caracteres" : "Tu contraseña"} /></label>
          <Button type="submit" disabled={pending} className="mt-2 w-full bg-[#B99757] py-5 font-semibold text-[#07182B] hover:bg-[#C9AA68]">{pending ? "Validando acceso…" : isRegister ? "Crear mi cuenta" : "Ingresar al portal"}</Button>
        </form>
        <p className="mt-5 text-center text-xs leading-5 text-[#9AAFC1]">{isRegister ? "Al crear tu cuenta, podrás acceder como estudiante y el administrador podrá asignarte materias." : "Para asistencia con tu cuenta, comunícate con la administración de la institución."}</p>
      </section>
    </main>
  );
}
