import { BookOpenCheck, BrainCircuit, GraduationCap, LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

export default function CourseAIAssistantDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (subjectId: number) => Promise<void> | void }) {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<"basic" | "intermediate" | "advanced">("intermediate");
  const [period, setPeriod] = useState("2026-1");
  const createCourse = trpc.academic.ai.createGeneratedCourse.useMutation({
    onSuccess: async ({ id }) => {
      toast.success("La materia completa fue generada con IA.");
      setTopic("");
      await onCreated(id);
      onOpenChange(false);
    },
    onError: error => toast.error(error.message),
  });

  const generate = () => {
    if (topic.trim().length < 3) return toast.error("Describe el tema principal de la materia.");
    if (period.trim().length < 2) return toast.error("Indica el período académico.");
    createCourse.mutate({ topic: topic.trim(), level, period: period.trim() });
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto border-[#42463F] bg-[#1C201D] text-[#D8D9D2] sm:max-w-2xl"><DialogHeader><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[#C8AE72]/35 bg-[#343A33] text-[#D8BF86]"><BrainCircuit className="h-5 w-5" strokeWidth={1.8} /></div><DialogTitle className="font-display text-2xl text-white">Asistente curricular IA</DialogTitle><DialogDescription className="text-[#B8BBB2]">Describe la materia que necesitas. La IA preparará un curso académico completo y lo dejará listo para revisar dentro de WijiEdu.</DialogDescription></DialogHeader><div className="space-y-5 py-3"><div className="rounded-xl border border-[#C8AE72]/25 bg-[#343A33] p-4"><p className="flex items-center gap-2 text-sm font-bold text-[#E4D0A0]"><Sparkles className="h-4 w-4" strokeWidth={1.8} />Contenido que se generará</p><div className="mt-3 grid gap-2 text-sm text-[#D8D9D2] sm:grid-cols-2"><span className="flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-[#D8BF86]" strokeWidth={1.8} />Programa, módulos y lecciones</span><span className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-[#D8BF86]" strokeWidth={1.8} />Competencias y objetivos</span><span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#D8BF86]" strokeWidth={1.8} />Ilustraciones educativas</span><span className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-[#D8BF86]" strokeWidth={1.8} />Recursos y evaluaciones de cierre</span></div></div><div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.1em] text-[#D8BF86]">Tema o nombre de la materia</label><textarea className="wij-input min-h-24 resize-y" value={topic} onChange={event => setTopic(event.target.value)} placeholder="Ejemplo: Finanzas personales para jóvenes emprendedores" maxLength={180} /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.1em] text-[#D8BF86]">Nivel</label><select className="wij-input" value={level} onChange={event => setLevel(event.target.value as typeof level)}><option value="basic">Básico</option><option value="intermediate">Intermedio</option><option value="advanced">Avanzado</option></select></div><div><label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.1em] text-[#D8BF86]">Período académico</label><input className="wij-input" value={period} onChange={event => setPeriod(event.target.value)} placeholder="2026-1" maxLength={60} /></div></div><p className="rounded-md border border-[#42463F] bg-[#141714] p-3 text-xs leading-5 text-[#B8BBB2]">La generación crea una materia independiente. Al finalizar se abrirá su programa para que puedas revisar módulos, competencias, recursos, imágenes y actividades.</p></div><DialogFooter><Button variant="outline" className="border-[#42463F] text-[#D8D9D2] hover:bg-[#242724]" onClick={() => onOpenChange(false)} disabled={createCourse.isPending}>Cancelar</Button><Button onClick={generate} disabled={createCourse.isPending} className="bg-[#B69A5E] text-[#191B19] hover:bg-[#D8BF86]">{createCourse.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" strokeWidth={1.8} />}{createCourse.isPending ? "Generando curso completo…" : "Generar materia con IA"}</Button></DialogFooter></DialogContent></Dialog>;
}
