"use client";
import React, { useEffect, useState } from "react";
import { cx, Icon, Modal, Toaster } from "@/components/ui";
import { ensureFontStylesheet } from "@/lib/fonts";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { navigate, useRoute } from "@/lib/router";
import { initStore, updateSettings, useApp, useCurrentProject, useCurrentUser } from "@/lib/store";
import { Composer } from "@/views/Composer";
import { TemplateEditor } from "@/views/TemplateEditor";
import { Dashboard, RecentPage, TemplatePicker, TemplatesPage } from "@/views/Pages";
import { BrandKitPage } from "@/views/BrandKit";
import { DataSourcesPage } from "@/views/DataSources";
import { BulkPage } from "@/views/Bulk";
import { ProjectsPage, SettingsPage } from "@/views/Settings";

const NAV = [
  { to: "/", icon: "home", label: "Přehled" },
  { to: "/create", icon: "plus", label: "Vytvořit grafiku" },
  { to: "/templates", icon: "layers", label: "Moje šablony" },
  { to: "/recent", icon: "clock", label: "Nedávné grafiky" },
  { to: "/data", icon: "database", label: "Datové zdroje" },
  { to: "/brand", icon: "palette", label: "Brand kit" },
  { to: "/bulk", icon: "stack", label: "Hromadné generování" },
];

export default function App() {
  const ready = useApp((s) => s.ready);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    ensureFontStylesheet();
    initStore().catch((e) => setErr(String(e?.message ?? e)));
  }, []);
  if (err)
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="font-cond text-xl font-bold uppercase">Aplikaci se nepodařilo spustit</p>
          <p className="mt-2 text-sm text-mute">{err}</p>
        </div>
      </div>
    );
  if (!ready)
    return (
      <div className="flex h-screen items-center justify-center bg-ink">
        <Logo className="animate-pulse text-white" />
      </div>
    );
  return <Shell />;
}

function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("flex items-center gap-2 font-cond text-[22px] font-extrabold uppercase italic leading-none tracking-tight", className)}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect x="1" y="1" width="24" height="24" rx="5" fill="#2A4BFF" />
        <path d="M8 19V7h6a4 4 0 0 1 0 8H8" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinejoin="round" />
        <circle cx="19" cy="19" r="2" fill="#fff" />
      </svg>
      Presetka
    </span>
  );
}

function Shell() {
  const { parts, query } = useRoute();
  const project = useCurrentProject();
  const [more, setMore] = useState(false);
  const top = "/" + (parts[0] ?? "");
  const fullBleed = (parts[0] === "create" && parts[1]) || (parts[0] === "templates" && parts[1]);

  let view: React.ReactNode;
  if (!project) view = <ProjectsPage />;
  else
    switch (parts[0]) {
      case undefined:
        view = <Dashboard />;
        break;
      case "create":
        view = parts[1] ? <Composer key={parts[1] + (query.get("g") ?? "")} templateId={parts[1]} graphicId={query.get("g") ?? undefined} /> : <TemplatePicker />;
        break;
      case "templates":
        view = parts[1] ? <TemplateEditor key={parts[1]} templateId={parts[1]} /> : <TemplatesPage />;
        break;
      case "recent":
        view = <RecentPage />;
        break;
      case "data":
        view = <DataSourcesPage />;
        break;
      case "brand":
        view = <BrandKitPage />;
        break;
      case "bulk":
        view = <BulkPage />;
        break;
      case "projects":
        view = <ProjectsPage />;
        break;
      case "settings":
        view = <SettingsPage />;
        break;
      default:
        view = <Dashboard />;
    }

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <Sidebar current={top} />
      <div className="flex min-w-0 flex-1 flex-col">
        {!fullBleed && <MobileTop />}
        <main className={cx("flex-1", !fullBleed && "pb-[calc(72px+env(safe-area-inset-bottom,0px))] lg:pb-0")}>{view}</main>
      </div>
      {!fullBleed && <BottomNav current={top} onMore={() => setMore(true)} />}
      <Modal open={more} onClose={() => setMore(false)} title="Menu">
        <div className="grid grid-cols-2 gap-2">
          {[...NAV.slice(4), { to: "/projects", icon: "folder", label: "Projekty" }, { to: "/settings", icon: "settings", label: "Nastavení" }].map((n) => (
            <button
              key={n.to}
              type="button"
              onClick={() => {
                setMore(false);
                navigate(n.to);
              }}
              className="flex items-center gap-2 rounded-md border border-line px-3 py-3 text-left text-sm font-semibold"
            >
              <Icon name={n.icon} /> {n.label}
            </button>
          ))}
        </div>
        <UserSwitch className="mt-4" light />
      </Modal>
      <Toaster />
    </div>
  );
}

function ProjectSwitch({ light }: { light?: boolean }) {
  const projects = useApp((s) => s.projects);
  const project = useCurrentProject();
  return (
    <div className="relative">
      <select
        value={project?.id}
        onChange={(e) => {
          if (e.target.value === "__manage") navigate("/projects");
          else updateSettings({ currentProjectId: e.target.value }).then(() => navigate("/"));
        }}
        className={cx(
          "h-11 w-full appearance-none rounded-md border pl-3 pr-8 text-left text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-signal/40",
          light ? "border-line bg-white text-ink" : "border-ink-3 bg-ink-2 text-white",
        )}
        aria-label="Projekt"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.parentName ? `${p.parentName} / ` : ""}
            {p.name}
          </option>
        ))}
        <option value="__manage">Spravovat projekty…</option>
      </select>
      <Icon name="chevronDown" size={16} className={cx("pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2", light ? "text-mute" : "text-white/50")} />
    </div>
  );
}

function UserSwitch({ className, light }: { className?: string; light?: boolean }) {
  const users = useApp((s) => s.settings.users);
  const user = useCurrentUser();
  return (
    <label className={cx("block", className)}>
      <span className={cx("mb-1 block font-cond text-[11px] font-bold uppercase tracking-[0.1em]", light ? "text-mute" : "text-white/40")}>Přihlášen jako</span>
      <div className="relative">
        <select
          value={user.id}
          onChange={(e) => updateSettings({ currentUserId: e.target.value })}
          className={cx("h-10 w-full appearance-none rounded-md border pl-3 pr-8 text-[13px] focus:outline-none", light ? "border-line bg-white" : "border-ink-3 bg-ink-2 text-white")}
          aria-label="Uživatel"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} – {ROLE_LABEL[u.role]}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={15} className={cx("pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2", light ? "text-mute" : "text-white/50")} />
      </div>
    </label>
  );
}

function Sidebar({ current }: { current: string }) {
  const user = useCurrentUser();
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-ink px-3 py-5 text-white lg:flex">
      <button type="button" onClick={() => navigate("/")} className="mb-6 px-2 text-left">
        <Logo />
      </button>
      <ProjectSwitch />
      <nav className="mt-5 flex flex-col gap-0.5">
        {NAV.map((n) => {
          const active = current === n.to;
          const disabled = n.to === "/create" && !can(user.role, "graphic.create");
          return (
            <button
              key={n.to}
              type="button"
              disabled={disabled}
              onClick={() => navigate(n.to)}
              className={cx(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-[14px] font-semibold transition-colors disabled:opacity-40",
                active ? "bg-white text-ink" : "text-white/70 hover:bg-ink-2 hover:text-white",
              )}
            >
              <Icon name={n.icon} size={18} />
              {n.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3 border-t border-ink-3 pt-4">
        <div className="flex gap-1">
          <button type="button" onClick={() => navigate("/projects")} className={cx("flex flex-1 items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-semibold", current === "/projects" ? "bg-ink-2 text-white" : "text-white/60 hover:text-white")}>
            <Icon name="folder" size={16} /> Projekty
          </button>
          <button type="button" onClick={() => navigate("/settings")} className={cx("flex flex-1 items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-semibold", current === "/settings" ? "bg-ink-2 text-white" : "text-white/60 hover:text-white")}>
            <Icon name="settings" size={16} /> Nastavení
          </button>
        </div>
        <UserSwitch />
      </div>
    </aside>
  );
}

function MobileTop() {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 bg-ink px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] text-white lg:hidden">
      <button type="button" onClick={() => navigate("/")} aria-label="Přehled">
        <Logo className="text-[19px]" />
      </button>
      <div className="min-w-0 flex-1">
        <ProjectSwitch />
      </div>
    </div>
  );
}

function BottomNav({ current, onMore }: { current: string; onMore: () => void }) {
  const items = [
    { to: "/", icon: "home", label: "Přehled" },
    { to: "/create", icon: "plus", label: "Vytvořit" },
    { to: "/templates", icon: "layers", label: "Šablony" },
    { to: "/recent", icon: "clock", label: "Nedávné" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
      {items.map((n) => (
        <button key={n.to} type="button" onClick={() => navigate(n.to)} className={cx("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", current === n.to ? "text-signal" : "text-mute")}>
          <span className={cx("flex h-8 w-12 items-center justify-center rounded-full", n.to === "/create" && "bg-ink text-white", current === n.to && n.to !== "/create" && "bg-signal-soft")}>
            <Icon name={n.icon} size={19} />
          </span>
          {n.label}
        </button>
      ))}
      <button type="button" onClick={onMore} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold text-mute">
        <span className="flex h-8 w-12 items-center justify-center">
          <Icon name="menu" size={19} />
        </span>
        Více
      </button>
    </nav>
  );
}
