import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { KeyRound, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function RequiredPasswordChange() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const changePassword = trpc.localAuth.changePassword.useMutation({
    onSuccess: data => { toast.success(data.message); window.location.reload(); },
    onError: error => toast.error(error.message),
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    changePassword.mutate({ currentPassword, newPassword });
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#07182B] px-5 py-8 text-[#ECF2F7]"><section className="w-full max-w-md rounded-xl border border-[#284761] bg-[#0C2138] p-7 shadow-[0_18px_48px_rgba(0,0,0,.22)] sm:p-8"><div className="mb-6 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-[#B99757] text-[#07182B]"><KeyRound className="h-7 w-7" /></div><p className="institutional-kicker">Seguridad de la cuenta</p><h1 className="mt-1 font-display text-2xl font-bold text-white">Cambia tu contraseña</h1><p className="mt-3 text-sm leading-6 text-[#C7D4DE]">El administrador te asignó una contraseña temporal. Debes reemplazarla antes de acceder al portal académico.</p></div><form className="space-y-4" onSubmit={submit}><label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8898AA]">Contraseña temporal</span><input required type="password" className="wij-input" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label><label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8898AA]">Nueva contraseña</span><input required minLength={8} type="password" className="wij-input" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" placeholder="Mínimo 8 caracteres" /></label><Button type="submit" disabled={changePassword.isPending} className="w-full bg-[#B99757] py-5 font-semibold text-[#07182B] hover:bg-[#C9AA68]">{changePassword.isPending ? "Guardando…" : "Guardar nueva contraseña"}</Button></form><p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-[#9AAFC1]"><ShieldCheck className="h-4 w-4 text-[#D3B56D]" />Solo tú puedes completar este cambio.</p></section></main>;
}
