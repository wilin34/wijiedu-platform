import { CalendarClock, ExternalLink, Pencil, Plus, Save, Trash2, Video, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui/button";

type Subject = { id: number; code: string; name: string };
type LiveStatus = "draft" | "published" | "completed" | "cancelled";
type LiveClassForm = { subjectId: string; title: string; description: string; meetUrl: string; startsAt: string; durationMinutes: string; status: LiveStatus };

const emptyForm = (): LiveClassForm => ({ subjectId: "", title: "", description: "", meetUrl: "", startsAt: "", durationMinutes: "60", status: "published" });
const statusLabels: Record<LiveStatus, string> = { draft: "Borrador", published: "Disponible", completed: "Finalizada", cancelled: "Cancelada" };

function localDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function inputDateTime(value: Date | string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function LiveClassesPanel({ subjects, canManage }: { subjects: Subject[]; canManage: boolean }) {
  const utils = trpc.useUtils();
  const classes = trpc.academic.liveClasses.list.useQuery();
  const [form, setForm] = useState<LiveClassForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const refresh = () => utils.academic.liveClasses.list.invalidate();
  const resetForm = () => { setEditingId(null); setForm(emptyForm()); };
  const createClass = trpc.academic.liveClasses.create.useMutation({
    onSuccess: async () => { toast.success("Clase en vivo publicada."); resetForm(); await refresh(); },
    onError: error => toast.error(error.message),
  });
  const updateClass = trpc.academic.liveClasses.update.useMutation({
    onSuccess: async () => { toast.success("Clase en vivo actualizada."); resetForm(); await refresh(); },
    onError: error => toast.error(error.message),
  });
  const removeClass = trpc.academic.liveClasses.remove.useMutation({ onSuccess: () => refresh(), onError: error => toast.error(error.message) });
  const isSaving = createClass.isPending || updateClass.isPending;

  const saveClass = () => {
    if (!form.subjectId || !form.title.trim() || !form.meetUrl.trim() || !form.startsAt) return toast.error("Completa la materia, el título, el horario y el enlace de Meet.");
    const data = { title: form.title.trim(), description: form.description.trim() || null, meetUrl: form.meetUrl.trim(), startsAt: new Date(form.startsAt).toISOString(), durationMinutes: Number(form.durationMinutes), status: form.status };
    if (editingId) updateClass.mutate({ id: editingId, data });
    else createClass.mutate({ ...data, subjectId: Number(form.subjectId) });
  };

  const editClass = (liveClass: { id: number; subjectId: number; title: string; description: string | null; meetUrl: string; startsAt: Date | string; durationMinutes: number; status: LiveStatus }) => {
    setEditingId(liveClass.id);
    setForm({ subjectId: String(liveClass.subjectId), title: liveClass.title, description: liveClass.description || "", meetUrl: liveClass.meetUrl, startsAt: inputDateTime(liveClass.startsAt), durationMinutes: String(liveClass.durationMinutes), status: liveClass.status });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#42463F] pb-5">
      <div><p className="institutional-kicker">Sesiones sincrónicas</p><h2 className="font-display text-2xl font-bold text-white">Clases en vivo</h2><p className="mt-1 max-w-2xl text-sm text-[#B8BBB2]">Las clases publicadas se habilitan para los estudiantes inscritos en cada materia.</p></div>
      <div className="flex items-center gap-2 rounded-md border border-[#C8AE72]/30 bg-[#343A33] px-3 py-2 text-xs font-semibold text-[#D8BF86]"><Video className="h-4 w-4" />Google Meet</div>
    </div>

    {canManage && <section className="wij-card p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-md border border-[#C8AE72]/30 bg-[#343A33] p-2 text-[#D8BF86]">{editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}</div><div><h3 className="font-display text-lg font-bold text-white">{editingId ? "Editar clase" : "Publicar una clase"}</h3><p className="text-sm text-[#B8BBB2]">Pega el enlace creado en Google Meet y selecciona a quién corresponde.</p></div></div>{editingId && <Button variant="ghost" size="sm" className="text-[#B8BBB2] hover:bg-[#343A33]" onClick={resetForm}><X className="h-4 w-4" />Cancelar edición</Button>}</div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label className="text-xs font-bold uppercase tracking-[.08em] text-[#C8AE72]">Materia<select className="wij-input mt-1" disabled={Boolean(editingId)} value={form.subjectId} onChange={event => setForm({ ...form, subjectId: event.target.value })}><option value="">Seleccionar</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.code} · {subject.name}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-[.08em] text-[#C8AE72]">Título<input className="wij-input mt-1" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Ej. Tutoría semanal" /></label><label className="text-xs font-bold uppercase tracking-[.08em] text-[#C8AE72]">Inicio<input type="datetime-local" className="wij-input mt-1" value={form.startsAt} onChange={event => setForm({ ...form, startsAt: event.target.value })} /></label><label className="text-xs font-bold uppercase tracking-[.08em] text-[#C8AE72]">Duración<select className="wij-input mt-1" value={form.durationMinutes} onChange={event => setForm({ ...form, durationMinutes: event.target.value })}><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option></select></label><label className="text-xs font-bold uppercase tracking-[.08em] text-[#C8AE72]">Estado<select className="wij-input mt-1" value={form.status} onChange={event => setForm({ ...form, status: event.target.value as LiveStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-[.08em] text-[#C8AE72] md:col-span-2 xl:col-span-2">Enlace de Google Meet<input type="url" className="wij-input mt-1" value={form.meetUrl} onChange={event => setForm({ ...form, meetUrl: event.target.value })} placeholder="https://meet.google.com/xxx-xxxx-xxx" /></label><label className="text-xs font-bold uppercase tracking-[.08em] text-[#C8AE72] md:col-span-2 xl:col-span-4">Descripción<input className="wij-input mt-1" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Tema, instrucciones o recordatorio" /></label></div><div className="mt-4 flex justify-end"><Button className="bg-[#B69A5E] text-[#171A17] hover:bg-[#C8AE72]" disabled={isSaving} onClick={saveClass}>{editingId ? <Save className="h-4 w-4" /> : <Video className="h-4 w-4" />}{editingId ? "Guardar cambios" : "Publicar clase"}</Button></div></section>}

    {classes.isLoading ? <div className="wij-card p-8 text-center text-sm text-[#B8BBB2]">Cargando clases en vivo…</div> : !classes.data?.length ? <div className="wij-card p-10 text-center"><Video className="mx-auto h-8 w-8 text-[#D8BF86]" /><h3 className="mt-3 font-display text-lg font-bold text-white">No hay clases en vivo programadas</h3><p className="mt-2 text-sm text-[#B8BBB2]">Cuando administración publique una sesión para tu materia, podrás unirte desde este espacio.</p></div> : <div className="grid gap-4 xl:grid-cols-2">{classes.data.map(liveClass => <article key={liveClass.id} className="wij-card p-5"><div className="flex gap-4"><div className="rounded-md border border-[#C8AE72]/30 bg-[#343A33] p-3 text-[#D8BF86]"><CalendarClock className="h-6 w-6" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[.08em] text-[#D8BF86]">{liveClass.subjectCode} · {liveClass.subjectName}</p><h3 className="mt-1 font-display text-xl font-bold text-white">{liveClass.title}</h3></div><span className="rounded-full border border-[#C8AE72]/30 bg-[#343A33] px-2.5 py-1 text-[10px] font-bold uppercase text-[#D8BF86]">{statusLabels[liveClass.status as LiveStatus] || liveClass.status}</span></div><p className="mt-3 text-sm leading-6 text-[#B8BBB2]">{liveClass.description || "Clase sin descripción adicional."}</p><p className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#E4D0A0]"><CalendarClock className="h-4 w-4" />{localDateTime(liveClass.startsAt)} · {liveClass.durationMinutes} min</p><div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-[#42463F] pt-4"><a href={liveClass.meetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md bg-[#B69A5E] px-3 py-2 text-sm font-semibold text-[#171A17] transition hover:bg-[#C8AE72]"><ExternalLink className="h-4 w-4" />Unirse por Meet</a>{canManage && <div className="flex gap-1"><Button variant="ghost" size="sm" className="text-[#D8BF86] hover:bg-[#343A33]" onClick={() => editClass(liveClass)}><Pencil className="h-4 w-4" />Editar</Button><Button variant="ghost" size="sm" className="text-[#D5A09A] hover:bg-[#432C2A]" disabled={removeClass.isPending} onClick={() => { if (window.confirm("¿Eliminar esta clase en vivo?")) removeClass.mutate({ id: liveClass.id }); }}><Trash2 className="h-4 w-4" />Eliminar</Button></div>}</div></div></div></article>)}</div>}
  </div>;
}
