import { Button } from "@/components/ui/button";
import { KeyRound, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

type RecoveryRequest = { id: number; userId: number; status: "pending" | "resolved" | "cancelled"; requestedAt: Date | string; name: string | null; email: string | null; role: string };

export default function RecoveryRequestsPanel({ requests, pending, onResolve, onRefresh, focusRequestId }: { requests: RecoveryRequest[]; pending: boolean; onResolve: (request: RecoveryRequest) => Promise<string | undefined>; onRefresh: () => void; focusRequestId?: number | null }) {
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const pendingRequests = requests.filter(request => request.status === "pending");
  useEffect(() => {
    if (!focusRequestId) return;
    const timer = window.setTimeout(() => {
      const target = document.querySelector(`[data-recovery-request-id="${focusRequestId}"] button`) as HTMLButtonElement | null;
      target?.focus();
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [focusRequestId, pendingRequests.length]);
  return <section className="mt-6 rounded-xl border border-[#B99757]/35 bg-[#111E35] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="institutional-kicker">Atención institucional</p><h2 className="mt-1 flex items-center gap-2 font-display text-xl font-bold text-white"><ShieldAlert className="h-5 w-5 text-[#D8BF86]" />Solicitudes de contraseña</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#AAB8C4]">Cada solicitud se atiende desde esta institución. La contraseña temporal se muestra una sola vez al administrador para entregarla por un canal seguro.</p></div><Button variant="outline" size="sm" className="border-[#B99757]/40 bg-transparent text-[#E4D0A0] hover:bg-[#B99757]/10" onClick={onRefresh}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button></div>{temporaryPassword && <div className="mt-5 rounded-lg border border-[#D8BF86]/50 bg-[#D8BF86]/10 p-4 text-sm text-[#F0E5C6]"><p className="font-semibold">Contraseña temporal generada</p><p className="mt-1 font-mono text-base tracking-wide">{temporaryPassword}</p><p className="mt-2 text-xs text-[#D8CDAF]">Entrégala al usuario por un canal seguro. Se le exigirá cambiarla en el primer ingreso.</p><Button size="sm" variant="outline" className="mt-3 border-[#D8BF86]/40 bg-transparent text-[#F0E5C6]" onClick={() => setTemporaryPassword(null)}>Ocultar contraseña</Button></div>}{pendingRequests.length === 0 ? <p className="mt-5 rounded-lg border border-[#243356] bg-[#162040] p-4 text-sm text-[#8898AA]">No hay solicitudes pendientes.</p> : <div className="mt-5 space-y-3">{pendingRequests.map(request => <div key={request.id} data-recovery-request-id={request.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[#243356] bg-[#162040] p-4"><div className="min-w-0 flex-1"><p className="font-semibold text-white">{request.name || request.email || `Usuario #${request.userId}`}</p><p className="mt-1 text-xs text-[#8898AA]">{request.email || "Sin correo"} · {request.role === "teacher" ? "Docente" : "Estudiante"}</p></div><Button size="sm" disabled={pending} className="bg-[#B99757] text-[#07182B] hover:bg-[#C9AA68]" onClick={async () => setTemporaryPassword((await onResolve(request)) || null)}><KeyRound className="mr-2 h-4 w-4" />{pending ? "Generando…" : "Generar temporal"}</Button></div>)}</div>}</section>;
}
