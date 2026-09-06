import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { cn } from "@/lib/utils";
import { GraduationCap, Landmark, LogOut, Menu, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui/button";
import NotificationCenter from "./NotificationCenter";
import InstitutionSwitcher from "./InstitutionSwitcher";

export type WijiNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  visible?: boolean;
};

type DashboardLayoutProps = {
  children: React.ReactNode;
  items: WijiNavItem[];
  activeItem: string;
  onNavigate: (id: string) => void;
  pageTitle: string;
  roleLabel: string;
};

export default function DashboardLayout({
  children,
  items,
  activeItem,
  onNavigate,
  pageTitle,
  roleLabel,
}: DashboardLayoutProps) {
  const { loading, user, logout, error } = useAuth();
  const institutions = trpc.institutions.mine.useQuery(undefined, { enabled: Boolean(user) });
  const activeInstitutionId = typeof document === "undefined" ? 0 : Number(document.cookie.match(/(?:^|; )wijiedu_institution=(\d+)/)?.[1] || 0);
  const activeInstitution = institutions.data?.find(item => item.id === activeInstitutionId) || institutions.data?.[0];
  const primaryColor = activeInstitution?.primaryColor || "#B69A5E";
  const secondaryColor = activeInstitution?.secondaryColor || "#1B201D";
  const brandStyle = { "--brand-primary": primaryColor, "--brand-secondary": secondaryColor } as CSSProperties;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0A1628] px-5 text-[#E2E8F0]">
        <section className="w-full max-w-md rounded-[20px] border border-[#243356] bg-[#111E35] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#4F8EF7]/30 border-t-[#4F8EF7]" />
          <h1 className="font-display text-xl font-bold text-white">Preparando tu acceso</h1>
          <p className="mt-2 text-sm leading-6 text-[#8898AA]">Si la carga tarda demasiado, puedes comenzar el registro de nuevo.</p>
          <Button onClick={() => startLogin()} className="mt-6 w-full bg-[#4F8EF7] py-5 font-semibold hover:bg-[#3A7AE8]">Registrarme ahora</Button>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0A1628] px-5 text-[#E2E8F0]">
        <section className="w-full max-w-md rounded-[20px] border border-[#243356] bg-[#111E35] p-8 shadow-2xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4F8EF7] to-[#7C3AED] text-3xl">🎓</div>
            <h1 className="font-display text-3xl font-extrabold text-white">WijiEdu</h1>
            <p className="mt-1 text-sm text-[#8898AA]">Plataforma Educativa Profesional</p>
          </div>
          <p className="mb-6 text-center text-sm leading-6 text-[#B8C4D6]">Crea tu cuenta para acceder a materias, calificaciones y actividades en un solo lugar.</p>
          {error && <p className="mb-4 rounded-xl border border-[#F59E0B]/25 bg-[#F59E0B]/10 px-3 py-2 text-center text-xs leading-5 text-[#F8C45E]">La sesión anterior ya no es válida. Regístrate o accede de nuevo para continuar.</p>}
          <Button onClick={() => startLogin()} className="w-full bg-[#4F8EF7] py-5 font-semibold hover:bg-[#3A7AE8]">Regístrate gratis</Button>
          <button onClick={() => startLogin()} className="mt-4 w-full text-sm font-semibold text-[#75A7FF] transition hover:text-white">¿Ya tienes una cuenta? Acceder</button>
        </section>
      </main>
    );
  }

  const shownItems = items.filter(item => item.visible !== false);
  const initials = (user.name || "U").slice(0, 1).toUpperCase();

  return (
    <div style={brandStyle} className="min-h-screen bg-[#171A17] text-[#F1F0EA]">
      {mobileOpen && <button className="fixed inset-0 z-30 bg-black/60 lg:hidden" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#42463F] bg-[#1C201D] transition-all duration-200", collapsed ? "w-[72px]" : "w-[268px]", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        <div className="flex min-h-[78px] items-center gap-3 border-b border-[#42463F] px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/25 text-[#171A17] shadow-[inset_0_1px_0_rgba(255,255,255,.28)]" style={{ backgroundColor: primaryColor }}>{activeInstitution?.logoUrl ? <img src={activeInstitution.logoUrl} alt="Logo institucional" className="h-full w-full object-contain p-1.5" /> : <GraduationCap className="h-5 w-5" strokeWidth={1.8} />}</div>
          {!collapsed && <div className="min-w-0"><p className="truncate font-display text-xl font-bold tracking-tight text-white">{activeInstitution?.name || "WijiEdu"}</p><p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: primaryColor }}>Gestión académica</p></div>}
        </div>
        <button className="flex items-center gap-3 border-b border-[#42463F] px-5 py-4 text-left transition hover:bg-[#242724]" onClick={() => onNavigate("dashboard")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#343A33] text-xs font-bold text-[#E4D0A0]">{initials}</span>
          {!collapsed && <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{user.name || "Usuario"}</span><span className="block truncate text-[11px] text-[#B8BBB2]">{roleLabel}</span></span>}
        </button>
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {!collapsed && <p className="px-3 pb-3 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#C9AA68]">Navegación académica</p>}
          {shownItems.map(item => {
            const Icon = item.icon;
            const active = item.id === activeItem;
            return <button key={item.id} onClick={() => { onNavigate(item.id); setMobileOpen(false); }} className={cn("mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition", active ? "border border-[#C8AE72]/25 bg-[#343A33] font-semibold text-[#F2DFC0] shadow-[inset_0_1px_0_rgba(255,255,255,.04)]" : "border border-transparent text-[#B8BBB2] hover:bg-[#242724] hover:text-[#F1F0EA]", collapsed && "justify-center px-0")} title={collapsed ? item.label : undefined}><span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition", active ? "bg-[#B69A5E]/18 text-[#E4D0A0]" : "bg-[#343A33] text-[#B8BBB2]")}><Icon className="h-[17px] w-[17px]" strokeWidth={1.8} /></span>{!collapsed && <span>{item.label}</span>}</button>;
          })}
        </nav>
        <div className="border-t border-[#42463F] p-3">
          <button onClick={logout} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#B8BBB2] transition hover:bg-[#432726] hover:text-[#F3C2C2]", collapsed && "justify-center px-0")} title={collapsed ? "Salir" : undefined}><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#343A33]"><LogOut className="h-[17px] w-[17px]" strokeWidth={1.8} /></span>{!collapsed && "Cerrar sesión"}</button>
        </div>
      </aside>
      <div className={cn("min-h-screen transition-[margin] duration-200", collapsed ? "lg:ml-[72px]" : "lg:ml-[268px]")}>
        <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-[#42463F] bg-[#171A17]/95 px-4 backdrop-blur lg:px-8">
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#B8BBB2] hover:bg-[#343A33] hover:text-white lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Menu className="h-5 w-5" strokeWidth={1.8} /></button>
          <button className="hidden h-9 w-9 items-center justify-center rounded-xl text-[#B8BBB2] hover:bg-[#343A33] hover:text-white lg:inline-flex" onClick={() => setCollapsed(value => !value)} aria-label="Mostrar u ocultar menú">{collapsed ? <PanelLeftOpen className="h-5 w-5" strokeWidth={1.8} /> : <PanelLeftClose className="h-5 w-5" strokeWidth={1.8} />}</button>
          <div className="flex-1"><p className="hidden text-[10px] font-bold uppercase tracking-[0.15em] sm:block" style={{ color: primaryColor }}>Espacio institucional</p><h2 className="font-display text-xl font-bold text-white">{pageTitle}</h2></div>
          <InstitutionSwitcher />
          <NotificationCenter />
          <span className="hidden items-center gap-2 text-xs text-[#B8BBB2] sm:flex"><Landmark className="h-3.5 w-3.5 text-[#D8BF86]" strokeWidth={1.8} />{user.email || "Sesión institucional"}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B99757] text-[11px] font-bold text-[#07182B]">{initials}</span>
        </header>
        <main className="p-4 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
