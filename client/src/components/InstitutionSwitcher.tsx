import { Building2, Check, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function InstitutionSwitcher() {
  const institutions = trpc.institutions.mine.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const value = Number(document.cookie.match(/(?:^|; )wijiedu_institution=(\d+)/)?.[1] || 0);
    return value || null;
  });
  const [open, setOpen] = useState(false);
  const active = institutions.data?.find(item => item.id === selectedId) ?? institutions.data?.[0];

  useEffect(() => {
    if (!selectedId && active) setSelectedId(active.id);
    if (selectedId && active && selectedId !== active.id) {
      document.cookie = `wijiedu_institution=${active.id}; Path=/; Max-Age=2592000; SameSite=Lax`;
    }
  }, [active, selectedId]);

  if (!active || (institutions.data?.length ?? 0) < 1) return null;
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} className="flex max-w-[44px] items-center gap-2 rounded-xl border border-[#42463F] bg-[#242724] px-2.5 py-2 text-left transition hover:border-[#B99757]/70 sm:max-w-[240px] sm:px-3">
        <Building2 className="h-4 w-4 shrink-0 text-[#D8BF86]" strokeWidth={1.8} />
        <span className="hidden max-w-[180px] truncate text-xs font-semibold text-[#F1F0EA] sm:block">{active.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[#B8BBB2]" />
      </button>
      {open && <div className="absolute right-0 top-11 z-40 min-w-[230px] overflow-hidden rounded-xl border border-[#42463F] bg-[#242724] p-1.5 shadow-[0_18px_45px_rgba(0,0,0,.35)]">
        <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#C9AA68]">Espacio institucional</p>
        {institutions.data?.map(item => <button type="button" key={item.id} onClick={() => { setSelectedId(item.id); document.cookie = `wijiedu_institution=${item.id}; Path=/; Max-Age=2592000; SameSite=Lax`; setOpen(false); window.location.reload(); }} className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs text-[#D9DCD5] transition hover:bg-[#343A33]">
          <span className="truncate">{item.name}</span>{item.id === active.id && <Check className="h-3.5 w-3.5 shrink-0 text-[#D8BF86]" />}
        </button>)}
      </div>}
    </div>
  );
}
