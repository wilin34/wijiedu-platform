import { trpc } from "@/lib/trpc";
import { Bell, Check, CheckCheck, ClipboardCheck, Info, MessageSquare, Settings2, Video, X } from "lucide-react";
import { useState } from "react";

const icons = { academic: Info, assessment: ClipboardCheck, live_class: Video, message: MessageSquare, system: Bell } as const;

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const list = trpc.notifications.list.useQuery(undefined, { enabled: open, refetchInterval: open ? 60_000 : false });
  const unread = trpc.notifications.unreadCount.useQuery(undefined, { refetchInterval: 60_000 });
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => { void utils.notifications.list.invalidate(); void utils.notifications.unreadCount.invalidate(); } });
  const markAll = trpc.notifications.markAllRead.useMutation({ onSuccess: () => { void utils.notifications.list.invalidate(); void utils.notifications.unreadCount.invalidate(); } });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const preferences = trpc.notifications.preferences.useQuery(undefined, { enabled: open && settingsOpen });
  const updatePreferences = trpc.notifications.updatePreferences.useMutation({ onSuccess: () => void utils.notifications.preferences.invalidate() });
  const items = list.data ?? [];

  return (
    <div className="relative">
      <button type="button" aria-label="Abrir notificaciones" aria-expanded={open} onClick={() => setOpen(value => !value)} className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#B8BBB2] transition hover:bg-[#343A33] hover:text-white">
        <Bell className="h-[17px] w-[17px]" strokeWidth={1.8} />
        {(unread.data ?? 0) > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B99757] px-1 text-[9px] font-bold text-[#171A17]">{(unread.data ?? 0) > 99 ? "99+" : unread.data}</span>}
      </button>
      {open && <>
        <button type="button" aria-label="Cerrar notificaciones" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} />
        <section className="absolute right-0 top-11 z-30 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-[#42463F] bg-[#242724] shadow-[0_18px_50px_rgba(0,0,0,.32)]">
          <header className="flex items-center justify-between border-b border-[#42463F] px-4 py-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C9AA68]">Centro de avisos</p><h3 className="mt-0.5 font-display text-base font-bold text-white">Notificaciones</h3></div>
            <div className="flex items-center gap-1"><button type="button" aria-label="Marcar todas como leídas" title="Marcar todas como leídas" disabled={!items.some(item => !item.readAt) || markAll.isPending} onClick={() => markAll.mutate()} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#D8BF86] hover:bg-[#343A33] disabled:opacity-40"><CheckCheck className="h-4 w-4" /></button><button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#B8BBB2] hover:bg-[#343A33]"><X className="h-4 w-4" /></button></div>
          </header>
          <div className="max-h-[min(60vh,420px)] overflow-y-auto">
            {list.isLoading && <p className="px-4 py-8 text-center text-sm text-[#B8BBB2]">Cargando avisos…</p>}
            {!list.isLoading && items.length === 0 && <div className="px-5 py-10 text-center"><Bell className="mx-auto mb-3 h-7 w-7 text-[#C9AA68]" /><p className="text-sm font-semibold text-white">Todo está al día</p><p className="mt-1 text-xs text-[#B8BBB2]">Aquí aparecerán tus avisos académicos.</p></div>}
            {items.map(item => { const Icon = icons[item.type]; return <article key={item.id} className={`flex gap-3 border-b border-[#42463F]/70 px-4 py-3 ${item.readAt ? "opacity-70" : "bg-[#343A33]/45"}`}>
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#B99757]/15 text-[#E4D0A0]"><Icon className="h-4 w-4" strokeWidth={1.8} /></span>
              <a href={item.href || "/"} onClick={() => { if (!item.readAt) markRead.mutate({ id: item.id }); }} className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#B99757]"><p className="text-sm font-semibold text-white">{item.title}</p><p className="mt-0.5 text-xs leading-5 text-[#C4C8BF]">{item.message}</p><p className="mt-1 text-[10px] text-[#8F968B]">{new Date(item.createdAt).toLocaleString()}</p></a>
              {!item.readAt && <button type="button" title="Marcar como leída" aria-label={`Marcar ${item.title} como leída`} onClick={() => markRead.mutate({ id: item.id })} className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#D8BF86] hover:bg-[#343A33]"><Check className="h-3.5 w-3.5" /></button>}
            </article>; })}
          </div>
          <footer className="border-t border-[#42463F] px-4 py-3">
            <button type="button" onClick={() => setSettingsOpen(value => !value)} className="inline-flex items-center gap-2 text-xs font-semibold text-[#D8BF86] hover:text-white"><Settings2 className="h-3.5 w-3.5" />{settingsOpen ? "Ocultar preferencias" : "Personalizar avisos"}</button>
            {settingsOpen && <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#C4C8BF]">
              {(["academicEnabled", "assessmentEnabled", "liveClassEnabled", "messageEnabled"] as const).map((key, index) => { const labels = ["Académicos", "Evaluaciones", "Clases en vivo", "Mensajes"]; const value = preferences.data?.[key] === 1; return <label key={key} className="flex items-center gap-2 rounded-lg bg-[#343A33]/60 px-2.5 py-2"><input type="checkbox" checked={value} disabled={!preferences.data || updatePreferences.isPending} onChange={event => { const current = preferences.data; if (!current) return; updatePreferences.mutate({ academicEnabled: key === "academicEnabled" ? (event.target.checked ? true : false) : current.academicEnabled === 1, assessmentEnabled: key === "assessmentEnabled" ? event.target.checked : current.assessmentEnabled === 1, liveClassEnabled: key === "liveClassEnabled" ? event.target.checked : current.liveClassEnabled === 1, messageEnabled: key === "messageEnabled" ? event.target.checked : current.messageEnabled === 1 }); }} className="accent-[#B99757]" />{labels[index]}</label>; })}
            </div>}
          </footer>
        </section>
      </>}
    </div>
  );
}
