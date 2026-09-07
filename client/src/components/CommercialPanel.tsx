import { useState } from "react";
import { BriefcaseBusiness, CheckCircle2, MessageSquare, Plus, RefreshCw, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui/button";

const statusLabels = {
  new: "Nuevo",
  contacted: "Contactado",
  interested: "Interesado",
  admitted: "Admitido",
  enrolled: "Matriculado",
  lost: "No continúa",
} as const;

export default function CommercialPanel() {
  const [status, setStatus] = useState<keyof typeof statusLabels | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", interestedProgram: "", source: "", notes: "" });
  const utils = trpc.useUtils();
  const prospects = trpc.commercial.listProspects.useQuery(status === "all" ? undefined : { status });
  const createProspect = trpc.commercial.createProspect.useMutation({
    onSuccess: async () => {
      toast.success("Prospecto registrado.");
      setForm({ fullName: "", email: "", phone: "", interestedProgram: "", source: "", notes: "" });
      setShowForm(false);
      await utils.commercial.listProspects.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const convert = trpc.commercial.convertToStudent.useMutation({
    onSuccess: async () => {
      toast.success("El interesado fue convertido en estudiante.");
      await Promise.all([utils.commercial.listProspects.invalidate(), utils.academic.students.list.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });
  const addActivity = trpc.commercial.addActivity.useMutation({
    onSuccess: async () => {
      toast.success("Seguimiento registrado.");
      await utils.commercial.listProspects.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  const statuses: Array<keyof typeof statusLabels | "all"> = ["all", "new", "contacted", "interested", "admitted", "enrolled", "lost"];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#B69A5E]/15 text-[#D8BF86]"><BriefcaseBusiness className="h-5 w-5" /></div><div><h2 className="font-display text-2xl font-bold text-white">Gestión Comercial</h2><p className="text-sm text-[#9AA8B9]">Convierte oportunidades de admisión en matrículas con trazabilidad institucional.</p></div></div>
      </div>
      <Button className="bg-[#B69A5E] text-[#171A17] hover:bg-[#D8BF86]" onClick={() => setShowForm(value => !value)}><Plus className="h-4 w-4" />Nuevo prospecto</Button>
    </div>

    {showForm && <section className="wij-card p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-display text-lg font-bold text-white">Registrar prospecto</h3><p className="text-sm text-[#9AA8B9]">Los datos se guardan únicamente en la institución activa.</p></div><UserPlus className="h-5 w-5 text-[#D8BF86]" /></div><div className="grid gap-4 md:grid-cols-2"><input className="wij-input" placeholder="Nombre completo" value={form.fullName} onChange={event => setForm({ ...form, fullName: event.target.value })} /><input className="wij-input" type="email" placeholder="Correo electrónico" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /><input className="wij-input" placeholder="Teléfono" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /><input className="wij-input" placeholder="Programa de interés" value={form.interestedProgram} onChange={event => setForm({ ...form, interestedProgram: event.target.value })} /><input className="wij-input" placeholder="Origen: feria, web, referido…" value={form.source} onChange={event => setForm({ ...form, source: event.target.value })} /><textarea className="wij-input min-h-20 py-3 md:col-span-2" placeholder="Notas comerciales" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></div><div className="mt-4 flex justify-end gap-2"><Button variant="outline" className="border-[#3A4556] bg-transparent text-[#DDE5EE]" onClick={() => setShowForm(false)}>Cancelar</Button><Button className="bg-[#B69A5E] text-[#171A17] hover:bg-[#D8BF86]" disabled={createProspect.isPending || form.fullName.trim().length < 2 || !form.email} onClick={() => createProspect.mutate({ ...form, phone: form.phone || null, interestedProgram: form.interestedProgram || null, source: form.source || null, notes: form.notes || null })}>Guardar prospecto</Button></div></section>}

    <section className="wij-card p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{statuses.map(value => <button key={value} onClick={() => setStatus(value)} className={status === value ? "rounded-full bg-[#B69A5E] px-3 py-1.5 text-xs font-bold text-[#171A17]" : "rounded-full border border-[#3A4556] px-3 py-1.5 text-xs font-semibold text-[#AAB7C6] hover:border-[#B69A5E]/60"}>{value === "all" ? "Todos" : statusLabels[value]}</button>)}</div><button className="inline-flex items-center gap-2 text-sm text-[#D8BF86]" onClick={() => prospects.refetch()}><RefreshCw className="h-4 w-4" />Actualizar</button></div></section>

    {prospects.isLoading ? <div className="wij-card p-10 text-center text-sm text-[#9AA8B9]">Cargando prospectos…</div> : !prospects.data?.length ? <div className="wij-card p-10 text-center"><BriefcaseBusiness className="mx-auto h-8 w-8 text-[#B69A5E]" /><h3 className="mt-3 font-display font-bold text-white">Aún no hay prospectos</h3><p className="mt-1 text-sm text-[#9AA8B9]">Registra el primer interesado para comenzar el seguimiento.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{prospects.data.map(prospect => <article key={prospect.id} className="wij-card p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-display font-bold text-white">{prospect.fullName}</h3><p className="mt-1 text-sm text-[#AAB7C6]">{prospect.email}{prospect.phone ? ` · ${prospect.phone}` : ""}</p></div><span className="rounded-full bg-[#B69A5E]/15 px-2.5 py-1 text-[11px] font-bold text-[#D8BF86]">{statusLabels[prospect.status]}</span></div><div className="mt-4 grid gap-2 text-sm text-[#B7C3D0] sm:grid-cols-2"><p><span className="text-[#7F8EA0]">Programa:</span> {prospect.interestedProgram || "Sin definir"}</p><p><span className="text-[#7F8EA0]">Origen:</span> {prospect.source || "No registrado"}</p></div>{prospect.notes && <p className="mt-3 rounded-xl bg-[#17202A] p-3 text-sm text-[#B7C3D0]">{prospect.notes}</p>}<div className="mt-5 flex flex-wrap gap-2 border-t border-[#2A3645] pt-4"><Button size="sm" variant="outline" className="border-[#3A4556] bg-transparent text-[#DDE5EE]" disabled={addActivity.isPending} onClick={() => addActivity.mutate({ prospectId: prospect.id, activityType: "note", summary: "Seguimiento realizado desde el panel comercial." })}><MessageSquare className="h-4 w-4" />Registrar seguimiento</Button>{prospect.status !== "enrolled" && <Button size="sm" className="bg-[#2F9E72] hover:bg-[#267F5C]" disabled={convert.isPending} onClick={() => { if (window.confirm(`¿Convertir a ${prospect.fullName} en estudiante?`)) convert.mutate({ prospectId: prospect.id }); }}><CheckCircle2 className="h-4 w-4" />Convertir a matriculado</Button>}</div></article>)}</div>}
  </div>;
}
