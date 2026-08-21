import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { cn } from "@/lib/utils";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

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
  const { loading, user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return <div className="min-h-screen bg-[#0A1628]" />;
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
          <p className="mb-6 text-center text-sm leading-6 text-[#B8C4D6]">Inicia sesión con Manus para acceder de forma segura a tu espacio académico.</p>
          <Button onClick={() => startLogin()} className="w-full bg-[#4F8EF7] py-5 font-semibold hover:bg-[#3A7AE8]">Iniciar sesión con Manus</Button>
        </section>
      </main>
    );
  }

  const shownItems = items.filter(item => item.visible !== false);
  const initials = (user.name || "U").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0A1628] text-[#E2E8F0]">
      {mobileOpen && <button className="fixed inset-0 z-30 bg-black/60 lg:hidden" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#243356] bg-[#111E35] transition-all duration-200", collapsed ? "w-[72px]" : "w-[252px]", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        <div className="flex min-h-[72px] items-center gap-3 border-b border-[#243356] px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#4F8EF7] to-[#7C3AED] text-xl">🎓</div>
          {!collapsed && <div className="min-w-0"><p className="font-display text-lg font-extrabold tracking-tight text-white">WijiEdu</p><p className="text-[10px] uppercase tracking-[0.14em] text-[#8898AA]">Plataforma Educativa</p></div>}
        </div>
        <button className="flex items-center gap-3 border-b border-[#243356] px-4 py-3 text-left transition hover:bg-[#162040]" onClick={() => onNavigate("dashboard")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4F8EF7] to-[#7C3AED] text-xs font-bold text-white">{initials}</span>
          {!collapsed && <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{user.name || "Usuario"}</span><span className="block truncate text-[11px] text-[#8898AA]">{roleLabel}</span></span>}
        </button>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {!collapsed && <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#8898AA]">Principal</p>}
          {shownItems.map(item => {
            const Icon = item.icon;
            const active = item.id === activeItem;
            return <button key={item.id} onClick={() => { onNavigate(item.id); setMobileOpen(false); }} className={cn("mb-1 flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm transition", active ? "bg-[#4F8EF7]/15 font-semibold text-[#75A7FF]" : "text-[#8898AA] hover:bg-[#162040] hover:text-[#E2E8F0]", collapsed && "justify-center px-0")} title={collapsed ? item.label : undefined}><Icon className="h-[18px] w-[18px] shrink-0" />{!collapsed && <span>{item.label}</span>}</button>;
          })}
        </nav>
        <div className="border-t border-[#243356] p-2">
          <button onClick={logout} className={cn("flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm text-[#8898AA] transition hover:bg-[#EF4444]/10 hover:text-[#F87171]", collapsed && "justify-center px-0")} title={collapsed ? "Salir" : undefined}><LogOut className="h-[18px] w-[18px]" />{!collapsed && "Salir"}</button>
        </div>
      </aside>
      <div className={cn("min-h-screen transition-[margin] duration-200", collapsed ? "lg:ml-[72px]" : "lg:ml-[252px]")}>
        <header className="sticky top-0 z-20 flex h-[66px] items-center gap-3 border-b border-[#243356] bg-[#111E35]/95 px-4 backdrop-blur lg:px-7">
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#8898AA] hover:bg-[#162040] hover:text-white lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Menu className="h-5 w-5" /></button>
          <button className="hidden h-9 w-9 items-center justify-center rounded-lg text-[#8898AA] hover:bg-[#162040] hover:text-white lg:inline-flex" onClick={() => setCollapsed(value => !value)} aria-label="Mostrar u ocultar menú">{collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</button>
          <h2 className="font-display flex-1 text-lg font-bold text-white">{pageTitle}</h2>
          <span className="hidden text-xs text-[#8898AA] sm:block">{user.email || "Sesión autenticada"}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#4F8EF7] to-[#7C3AED] text-[11px] font-bold text-white">{initials}</span>
        </header>
        <main className="p-4 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
