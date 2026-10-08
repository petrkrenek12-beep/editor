"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GraphicCanvas } from "@/components/GraphicCanvas";
import { DataForm, keepImages } from "@/components/DataForm";
import { AiPanel } from "@/components/AiPanel";
import { ScreenshotImport } from "@/components/ScreenshotImport";
import { UpdateBanner } from "@/components/UpdateBanner";
import { Badge, Button, cx, Icon, IconButton, Label, Modal, Segmented, Select, toast, Textarea, useWindowHeight, ZoomControl } from "@/components/ui";
import { applyMapping, autoMap, parseJson } from "@/lib/data-import";
import { canShareFiles, downloadBlob, fileName, renderPages, shareFiles, zipFiles, type ImageType } from "@/lib/export";
import { FORMATS, FORMAT_ORDER } from "@/lib/formats";
import { applyOverrides, clamp, frameUpdate, imageFieldOf, asImageValue } from "@/lib/graphic";
import { can, canEditElement } from "@/lib/permissions";
import { pageCount, type RenderEnv } from "@/lib/render";
import { navigate } from "@/lib/router";
import { uid, upsert, useApp, useAssetMap, useCurrentProject, useCurrentUser } from "@/lib/store";
import type { DataRecord, ElementOverride, FormatId, Frame, Graphic, Team, Template, TemplateElement } from "@/lib/types";
import { findTeam } from "@/lib/template-string";

type Tab = "data" | "layout" | "ai" | "export";

export function Composer({ templateId, graphicId }: { templateId: string; graphicId?: string }) {
  const project = useCurrentProject()!;
  const user = useCurrentUser();
  const template = useApp((s) => s.templates.find((t) => t.id === templateId));
  const existing = useApp((s) => (graphicId ? s.graphics.find((g) => g.id === graphicId) : undefined));
  const datasets = useApp((s) => s.datasets.filter((d) => d.projectId === project.id));
  const assets = useAssetMap(project.id);

  const [data, setData] = useState<DataRecord>(() => existing?.data ?? structuredClone(template?.sampleData ?? {}));
  const [format, setFormat] = useState<FormatId>(existing?.format ?? template?.baseFormat ?? "ig_portrait");
  const [overrides, setOverrides] = useState<Record<string, ElementOverride>>(existing?.overrides ?? {});
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>("data");
  const [selected, setSelected] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | undefined>(graphicId);
  const [dsOpen, setDsOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [zoom, setZoom] = useState<"fit" | number>("fit");
  const winH = useWindowHeight();

  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const on = () => setIsDesktop(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);

  const tpl = useMemo(() => (template ? applyOverrides(template, overrides) : undefined), [template, overrides]);
  const pages = tpl ? pageCount(tpl, data) : 1;
  useEffect(() => setPage((p) => Math.min(p, pages)), [pages]);

  const env: RenderEnv | null = useMemo(
    () => (tpl ? { template: tpl, data, format, brand: project.brand, teams: project.teams, assets, page, pages, placeholders: true } : null),
    [tpl, data, format, project.brand, project.teams, assets, page, pages],
  );

  const layoutMode = tab === "layout";
  const role = user.role;
  const brandLocks = project.brand.locks;

  const allAssets = useApp((s) => s.assets);
  const imageEls = useMemo(() => new Set((template?.elements ?? []).filter((e) => imageFieldOf(e) && e.type === "image" && (e.fit ?? "cover") === "cover").map((e) => e.id)), [template]);
  const containEls = useMemo(() => new Set((template?.elements ?? []).filter((e) => imageFieldOf(e) && e.type === "image" && e.fit === "contain").map((e) => e.id)), [template]);

  const photoLocked = role !== "admin" && brandLocks.photos;

  const onPan = useCallback(
    (id: string, dx: number, dy: number, frame: Frame) => {
      const el = template?.elements.find((e) => e.id === id);
      const key = el ? imageFieldOf(el) : null;
      if (!key) return;
      const move = (v: ReturnType<typeof asImageValue>) => {
        if (!v) return null;
        if (containEls.has(id)) {
          // vyříznutý hráč: posun v rámu
          return { ...v, fx: clamp((v.fx ?? 0.5) + dx / frame.w, 0, 1), fy: clamp((v.fy ?? 0.5) + dy / frame.h, 0, 1) };
        }
        // fotka přes plochu: volný posun všemi směry (i u zmenšené fotky)
        const meta = allAssets.find((x) => x.id === v.asset);
        const iw = meta?.w || frame.w;
        const ih = meta?.h || frame.h;
        const kk = Math.max(frame.w / iw, frame.h / ih) * Math.max(0.2, v.zoom ?? 1);
        const dw = iw * kk;
        const dh = ih * kk;
        const px0 = v.px ?? ((dw - frame.w) * (0.5 - (v.fx ?? 0.5))) / frame.w;
        const py0 = v.py ?? ((dh - frame.h) * (0.5 - (v.fy ?? 0.3))) / frame.h;
        return { ...v, px: clamp(px0 + dx / frame.w, -1.2, 1.2), py: clamp(py0 + dy / frame.h, -1.2, 1.2) };
      };
      setData((d) => {
        const p = template?.paginate;
        // carousel „co slide, to zápas“: fotka je v řádku aktuálního slidu
        if (p?.rowAsData && Array.isArray(d[p.field])) {
          const rows = d[p.field] as Record<string, unknown>[];
          const row = rows[page - 1];
          if (row && key in row) {
            const nv = move(asImageValue(row[key]));
            if (!nv) return d;
            return { ...d, [p.field]: rows.map((r, i) => (i === page - 1 ? { ...r, [key]: nv } : r)) as DataRecord[string] };
          }
        }
        const nv = move(asImageValue(d[key]));
        return nv ? { ...d, [key]: nv } : d;
      });
    },
    [template, containEls, page, allAssets],
  );

  if (!template || !tpl || !env) {
    return (
      <div className="p-8">
        <p className="text-mute">Šablona nebyla nalezena.</p>
        <Button className="mt-3" onClick={() => navigate("/create")}>
          Zpět na šablony
        </Button>
      </div>
    );
  }


  const interaction = {
    selectedId: selected,
    onSelect: setSelected,
    selectable: (id: string) => {
      const el = template.elements.find((e) => e.id === id);
      if (!el) return false;
      if (layoutMode) return canEditElement(role, el);
      return (imageEls.has(id) || containEls.has(id)) && !photoLocked && role !== "viewer";
    },
    editable: (id: string) => {
      const el = template.elements.find((e) => e.id === id);
      return !!el && layoutMode && canEditElement(role, el);
    },
    panMode: (id: string) => !layoutMode && (imageEls.has(id) || containEls.has(id)),
    onPan,
    onFrame: (id: string, frame: Frame) => {
      const el = tpl.elements.find((e) => e.id === id);
      if (!el) return;
      const upd = frameUpdate(el, template, format, frame);
      setOverrides((o) => ({ ...o, [id]: { ...(o[id] ?? {}), ...(upd as ElementOverride) } }));
    },
  };

  const readOnlyField = (f: Template["fields"][number]) => {
    if (role === "viewer") return true;
    if (role === "admin") return false;
    if (f.type === "image") return brandLocks.photos;
    if (["text", "longtext"].includes(f.type)) return brandLocks.text;
    return false;
  };

  const baseName = () => {
    const first = template.fields.find((f) => ["text", "team"].includes(f.type) && typeof data[f.key] === "string" && data[f.key]);
    return `${template.name}${first ? " – " + data[first.key] : ""}`;
  };

  const save = async (silent = false) => {
    if (!can(role, "graphic.create")) return;
    const c = document.createElement("canvas");
    const { renderToCanvas } = await import("@/lib/render");
    await renderToCanvas({ ...env, placeholders: false, page: 1 }, 320 / FORMATS[format].w, c);
    const g: Graphic = {
      id: savedId ?? uid("g-"),
      projectId: project.id,
      templateId: template.id,
      templateName: template.name,
      name: baseName(),
      format,
      data,
      overrides,
      thumb: c.toDataURL("image/jpeg", 0.8),
      createdAt: existing?.createdAt ?? Date.now(),
      createdBy: user.name,
    };
    await upsert("graphics", g);
    setSavedId(g.id);
    if (!silent) toast("Uloženo do Nedávných grafik");
  };

  const exportAll = async (type: ImageType, scale: number, formats: FormatId[], mode: "download" | "share") => {
    if (!can(role, "graphic.export")) {
      toast("Vaše role neumožňuje export.", "bad");
      return;
    }
    const files: { name: string; blob: Blob }[] = [];
    for (const f of formats) files.push(...(await renderPages({ ...env, format: f, placeholders: false }, type, scale, baseName())));
    void save(true);
    if (mode === "share") {
      try {
        await shareFiles(files, baseName());
      } catch (e) {
        if ((e as Error).name !== "AbortError") toast("Sdílení se nepovedlo: " + (e as Error).message, "bad");
      }
      return;
    }
    if (files.length === 1) {
      const r = await downloadBlob(files[0].blob, files[0].name);
      if (r === "saved") toast("Staženo: " + files[0].name);
    } else {
      const zip = await zipFiles(files);
      const r = await downloadBlob(zip, `${fileName(baseName(), formats[0], type).replace(/-\d+x\d+\.\w+$/, "")}-${files.length}x.zip`);
      if (r === "saved") toast(`ZIP s ${files.length} grafikami stažen`);
    }
  };

  const preview = (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
        {FORMAT_ORDER.filter((f) => template.formats.includes(f)).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            className={cx(
              "rounded-md border px-2.5 py-1 text-[12px] font-semibold tabular-nums transition-colors",
              format === f ? "border-ink bg-ink text-white" : "border-line bg-white text-mute hover:text-ink",
            )}
            title={`${FORMATS[f].label} ${FORMATS[f].w}×${FORMATS[f].h}`}
          >
            {FORMATS[f].short}
          </button>
        ))}
        {isDesktop && (
          <span className="ml-3">
            <ZoomControl value={zoom} onChange={setZoom} />
          </span>
        )}
      </div>
      <GraphicCanvas env={env} interaction={role === "viewer" ? undefined : interaction} maxHeight={isDesktop ? Math.max(420, winH - 57 - 120) : 420} zoom={isDesktop && zoom !== "fit" ? zoom : undefined} className="w-full" />
      <div className="flex items-center gap-3 text-[12px] text-mute">
        <span className="tabular-nums">
          {FORMATS[format].label} · {FORMATS[format].w}×{FORMATS[format].h}
        </span>
        {pages > 1 && (
          <span className="flex items-center gap-1">
            <IconButton icon="chevronLeft" label="Předchozí slide" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} />
            <span className="font-semibold tabular-nums text-ink">
              Slide {page}/{pages}
            </span>
            <IconButton icon="chevronRight" label="Další slide" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} />
          </span>
        )}
      </div>
      {!layoutMode && (imageEls.size > 0 || containEls.size > 0) && role !== "viewer" && (
        <p className="text-center text-[12px] text-mute">Tip: klepněte na fotku v náhledu a tažením posuňte výřez.</p>
      )}
    </div>
  );

  const dataPanel = (
    <div className="flex flex-col gap-4">
      {role !== "viewer" && <UpdateBanner template={template} />}
      {role !== "viewer" && <ScreenshotImport template={template} teams={project.teams} onData={(d) =>
            setData((cur) => {
              const next = { ...cur, ...d };
              for (const f of template.fields)
                if (f.type === "list" && Array.isArray(d[f.key]) && Array.isArray(cur[f.key]))
                  next[f.key] = keepImages(f, cur[f.key] as Record<string, unknown>[], d[f.key] as Record<string, unknown>[]) as DataRecord[string];
              return next;
            })
          } />}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon="database" onClick={() => setDsOpen(true)} disabled={role === "viewer"}>
          Načíst data
        </Button>
        <Button size="sm" icon="text" onClick={() => setJsonOpen(true)} disabled={role === "viewer"}>
          JSON
        </Button>
        <Button size="sm" icon="refresh" variant="ghost" onClick={() => setData(structuredClone(template.sampleData))} disabled={role === "viewer"}>
          Ukázková data
        </Button>
      </div>
      {usesTeamLogos(template.elements) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-panel px-3 py-2">
          <span className="text-[13px] font-semibold">Loga týmů</span>
          <Segmented
            size="sm"
            value={((data.__logos as string) || "") as "" | "color" | "white"}
            onChange={(v) => setData((d) => ({ ...d, __logos: v }))}
            options={[
              { value: "", label: "Podle šablony" },
              { value: "color", label: "Barevná" },
              { value: "white", label: "Bílá", title: "Použije bílá loga nahraná u týmů (Datové zdroje → Týmy a loga)" },
            ]}
          />
          {data.__logos === "white" && missingWhite(template, data, project.teams).length > 0 && (
            <p className="w-full text-[12px] text-mute">Bez bílého loga: {missingWhite(template, data, project.teams).join(", ")} – nahrajte ho v Datové zdroje → Týmy a loga.</p>
          )}
        </div>
      )}
      <DataForm
        template={template}
        data={data}
        onChange={setData}
        project={project}
        assets={assets}
        readOnlyField={readOnlyField}
        activeRow={template.paginate?.perPage === 1 ? page - 1 : undefined}
        onActiveRow={template.paginate ? (i) => setPage(Math.floor(i / template.paginate!.perPage) + 1) : undefined}
      />
    </div>
  );

  const layoutPanel = (
    <LayoutPanel
      template={template}
      format={format}
      overrides={overrides}
      setOverrides={setOverrides}
      selected={selected}
      setSelected={setSelected}
      role={role}
    />
  );

  const exportPanel = <ExportPanel onExport={exportAll} format={format} template={template} pages={pages} disabled={!can(role, "graphic.export")} />;
  const aiPanel = <AiPanel template={template} data={data} onApply={(patch) => setData((d) => ({ ...d, ...patch }))} disabled={role === "viewer"} />;

  const tabs: { id: Tab; label: string }[] = [
    { id: "data", label: "Data" },
    { id: "layout", label: "Rozložení" },
    { id: "ai", label: "AI texty" },
    { id: "export", label: "Export" },
  ];

  return (
    <div className="min-h-full">
      {/* horní lišta */}
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-20 flex items-center gap-2 border-b border-line bg-white/95 px-4 py-2.5 backdrop-blur lg:px-6">
        <IconButton icon="chevronLeft" label="Zpět" onClick={() => navigate("/create")} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-cond text-lg font-bold uppercase leading-tight">{template.name}</div>
          <div className="truncate text-[12px] text-mute">
            {project.parentName ? `${project.parentName} / ` : ""}
            {project.name}
            {savedId && " · uloženo"}
          </div>
        </div>
        {can(role, "graphic.create") && (
          <Button size="sm" icon="check" onClick={() => save()}>
            <span className="hidden sm:inline">Uložit</span>
          </Button>
        )}
        {can(role, "graphic.export") && (
          <Button size="sm" variant="primary" icon="download" onClick={() => exportAll("png", 1, [format], "download")}>
            PNG
          </Button>
        )}
      </div>

      {isDesktop ? (
        <div className="grid grid-cols-[320px_minmax(0,1fr)_290px] gap-0 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
          <aside className="h-[calc(100vh-57px)] overflow-y-auto border-r border-line bg-white p-5">
            <div className="mb-4">
              <Segmented value={tab === "layout" ? "layout" : "data"} onChange={(v) => setTab(v as Tab)} options={[{ value: "data", label: "Data" }, { value: "layout", label: "Rozložení" }]} />
            </div>
            {tab === "layout" ? layoutPanel : dataPanel}
          </aside>
          <main className="h-[calc(100vh-57px)] overflow-auto bg-paper px-6 py-4">{preview}</main>
          <aside className="h-[calc(100vh-57px)] space-y-6 overflow-y-auto border-l border-line bg-white p-5">
            {exportPanel}
            <div className="border-t border-line pt-5">{aiPanel}</div>
          </aside>
        </div>
      ) : (
        <div>
          <div className="bg-paper px-4 py-4">{preview}</div>
          <div className="sticky top-[calc(57px+env(safe-area-inset-top,0px))] z-10 flex border-b border-line bg-white">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cx("flex-1 border-b-2 py-3 font-cond text-[14px] font-bold uppercase tracking-wide", tab === t.id ? "border-signal text-ink" : "border-transparent text-mute")}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="bg-white px-4 py-5 pb-28">
            {tab === "data" && dataPanel}
            {tab === "layout" && layoutPanel}
            {tab === "ai" && aiPanel}
            {tab === "export" && exportPanel}
          </div>
        </div>
      )}

      <DatasetPicker open={dsOpen} onClose={() => setDsOpen(false)} template={template} datasets={datasets} onApply={(d) => setData(d)} data={data} />
      <JsonModal open={jsonOpen} onClose={() => setJsonOpen(false)} data={data} onApply={setData} />
    </div>
  );
}

// ── Panel rozložení (úpravy jen pro tuto grafiku) ─────────────

function LayoutPanel({
  template,
  format,
  overrides,
  setOverrides,
  selected,
  setSelected,
  role,
}: {
  template: Template;
  format: FormatId;
  overrides: Record<string, ElementOverride>;
  setOverrides: React.Dispatch<React.SetStateAction<Record<string, ElementOverride>>>;
  selected: string | null;
  setSelected: (id: string | null) => void;
  role: "admin" | "editor" | "viewer";
}) {
  const el = selected ? template.elements.find((e) => e.id === selected) : undefined;
  const o = el ? overrides[el.id] ?? {} : {};
  const patch = (p: ElementOverride) => el && setOverrides((all) => ({ ...all, [el.id]: { ...(all[el.id] ?? {}), ...p } }));
  const reset = () =>
    el &&
    setOverrides((all) => {
      const n = { ...all };
      delete n[el.id];
      return n;
    });
  return (
    <div className="space-y-4">
      <p className="text-sm text-mute">
        Úpravy platí jen pro tuto grafiku, šablona zůstane beze změny. Prvky se zámkem může měnit pouze administrátor.
      </p>
      <div className="max-h-[280px] overflow-y-auto rounded-md border border-line">
        {[...template.elements].reverse().map((e) => {
          const editable = canEditElement(role, e);
          const hidden = overrides[e.id]?.hidden ?? e.hidden;
          return (
            <div
              key={e.id}
              className={cx("flex items-center gap-2 border-b border-line px-2 py-1.5 last:border-0", selected === e.id && "bg-signal-soft")}
            >
              <button type="button" disabled={!editable} onClick={() => setSelected(e.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm disabled:opacity-50">
                <Icon name={typeIcon(e.type)} size={15} className="shrink-0 text-mute" />
                <span className="truncate">{e.name}</span>
              </button>
              {!editable && <Icon name="lock" size={14} className="text-mute" />}
              {editable && (
                <IconButton
                  icon={hidden ? "eyeOff" : "eye"}
                  label={hidden ? "Zobrazit" : "Skrýt"}
                  onClick={() => setOverrides((all) => ({ ...all, [e.id]: { ...(all[e.id] ?? {}), hidden: !hidden } }))}
                />
              )}
            </div>
          );
        })}
      </div>
      {el ? (
        <div className="space-y-3 rounded-md border border-line p-3">
          <div className="flex items-center justify-between">
            <span className="font-cond text-sm font-bold uppercase">{el.name}</span>
            <Button size="sm" variant="ghost" icon="refresh" onClick={reset}>
              Obnovit
            </Button>
          </div>
          <p className="text-[12px] text-mute">Přetáhněte prvek v náhledu, úchyty mění velikost. Úprava rámu platí pro formát {FORMATS[format].short}.</p>
          {el.type === "text" && (
            <>
              <div>
                <Label>Zarovnání</Label>
                <Segmented
                  value={(o.align ?? el.align ?? "left") as "left" | "center" | "right"}
                  onChange={(v) => patch({ align: v })}
                  options={[
                    { value: "left", label: "Vlevo" },
                    { value: "center", label: "Na střed" },
                    { value: "right", label: "Vpravo" },
                  ]}
                />
              </div>
              <div>
                <Label hint={`${Math.round(o.size ?? el.size)} px`}>Max. velikost písma</Label>
                <input type="range" min={12} max={Math.max(300, el.size * 1.5)} value={o.size ?? el.size} onChange={(e) => patch({ size: Number(e.target.value) })} className="w-full accent-[#2A4BFF]" aria-label="Velikost písma" />
                <p className="text-[11px] text-mute">Text se vždy zmenší tak, aby se vešel do rámu.</p>
              </div>
            </>
          )}
          <div>
            <Label hint={`${Math.round((o.opacity ?? el.opacity ?? 1) * 100)} %`}>Průhlednost</Label>
            <input type="range" min={0} max={1} step={0.01} value={o.opacity ?? el.opacity ?? 1} onChange={(e) => patch({ opacity: Number(e.target.value) })} className="w-full accent-[#2A4BFF]" aria-label="Průhlednost" />
          </div>
        </div>
      ) : (
        <p className="text-sm text-mute">Vyberte prvek v seznamu nebo klepnutím v náhledu.</p>
      )}
      {Object.keys(overrides).length > 0 && (
        <Button size="sm" variant="danger" icon="refresh" onClick={() => setOverrides({})}>
          Zrušit všechny úpravy rozložení
        </Button>
      )}
    </div>
  );
}

export function typeIcon(t: string) {
  return { text: "text", image: "image", rect: "square", ellipse: "circle", line: "line", path: "pen", list: "list" }[t] ?? "square";
}

// ── Export ──────────────────────────────────────────────────

function ExportPanel({ onExport, format, template, pages, disabled }: { onExport: (t: ImageType, scale: number, f: FormatId[], mode: "download" | "share") => Promise<void>; format: FormatId; template: Template; pages: number; disabled: boolean }) {
  const [type, setType] = useState<ImageType>("png");
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const share = useMemo(() => (typeof window !== "undefined" ? canShareFiles() : false), []);
  const run = async (label: string, f: FormatId[], mode: "download" | "share" = "download") => {
    setBusy(label);
    try {
      await onExport(type, scale, f, mode);
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setBusy(null);
    }
  };
  const f = FORMATS[format];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-cond text-sm font-bold uppercase tracking-[0.08em] text-mute">Export</h3>
        {pages > 1 && <Badge tone="signal">Carousel · {pages} slidy</Badge>}
      </div>
      <div className="flex flex-wrap gap-3">
        <Segmented value={type} onChange={setType} options={[{ value: "png", label: "PNG" }, { value: "jpg", label: "JPG" }]} />
        <Segmented
          value={String(scale)}
          onChange={(v) => setScale(Number(v))}
          options={[
            { value: "1", label: "1×", title: "Přesně podle formátu (doporučeno pro Instagram)" },
            { value: "2", label: "2×", title: "Dvojnásobné rozlišení" },
          ]}
        />
      </div>
      <p className="text-[12px] text-mute tabular-nums">
        Výstup: {f.w * scale} × {f.h * scale} px{pages > 1 ? `, ${pages} soubory` : ""}
      </p>
      <div className="grid gap-2">
        <Button variant="primary" size="lg" icon="download" disabled={disabled || !!busy} onClick={() => run("one", [format])}>
          {busy === "one" ? "Generuji…" : `Stáhnout ${FORMATS[format].short}`}
        </Button>
        {share && (
          <Button size="lg" icon="share" disabled={disabled || !!busy} onClick={() => run("share", [format], "share")}>
            {busy === "share" ? "Připravuji…" : "Sdílet / uložit do Fotek"}
          </Button>
        )}
        <Button size="lg" icon="zip" disabled={disabled || !!busy} onClick={() => run("all", template.formats)}>
          {busy === "all" ? "Generuji formáty…" : "Všechny formáty (ZIP)"}
        </Button>
      </div>
      {disabled && <p className="text-[12px] text-warn">Role „Pouze prohlížení“ nemůže exportovat.</p>}
    </div>
  );
}

// ── Načtení dat z datového zdroje ────────────────────────────

function DatasetPicker({ open, onClose, template, datasets, onApply, data }: { open: boolean; onClose: () => void; template: Template; datasets: { id: string; name: string; rows: DataRecord[] }[]; onApply: (d: DataRecord) => void; data: DataRecord }) {
  const [dsId, setDsId] = useState("");
  const [target, setTarget] = useState("");
  const [row, setRow] = useState(0);
  const listFields = template.fields.filter((f) => f.type === "list");
  const ds = datasets.find((d) => d.id === dsId) ?? datasets[0];
  useEffect(() => {
    setTarget(listFields[0]?.key ?? "__row");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);
  if (!open) return null;
  const columns = ds ? Object.keys(ds.rows[0] ?? {}) : [];
  const apply = () => {
    if (!ds) return;
    if (target !== "__row") {
      const lf = listFields.find((f) => f.key === target)!;
      const cols = lf.columns ?? [];
      const m = autoMap(cols, columns);
      const rows = ds.rows.map((r) => {
        const mapped = applyMapping({ ...template, fields: cols }, r as Record<string, unknown>, m, {});
        // sloupce se stejným názvem převezmeme i bez mapování
        for (const c of cols) if (mapped[c.key] === undefined && (r as Record<string, unknown>)[c.key] !== undefined) mapped[c.key] = (r as Record<string, unknown>)[c.key] as string;
        return mapped;
      });
      onApply({ ...data, [target]: rows as unknown as DataRecord[string] });
      toast(`Načteno ${rows.length} řádků z „${ds.name}“`);
    } else {
      const m = autoMap(template.fields, columns);
      onApply(applyMapping(template, ds.rows[row] as Record<string, unknown>, m, data));
      toast(`Řádek ${row + 1} z „${ds.name}“ použit`);
    }
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Načíst data"
      footer={
        <>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={apply} disabled={!ds}>
            Použít
          </Button>
        </>
      }
    >
      {datasets.length === 0 ? (
        <p className="text-sm text-mute">Projekt zatím nemá datové zdroje. Přidejte je v sekci Datové zdroje.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <Label>Datový zdroj</Label>
            <Select value={ds?.id} onChange={(e) => setDsId(e.target.value)}>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.rows.length})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Kam data vložit</Label>
            <Select value={target} onChange={(e) => setTarget(e.target.value)}>
              {listFields.map((f) => (
                <option key={f.key} value={f.key}>
                  Všechny řádky → seznam „{f.label}“
                </option>
              ))}
              <option value="__row">Jeden řádek → pole šablony</option>
            </Select>
          </div>
          {target === "__row" && ds && (
            <div>
              <Label>Řádek</Label>
              <Select value={row} onChange={(e) => setRow(Number(e.target.value))}>
                {ds.rows.map((r, i) => (
                  <option key={i} value={i}>
                    {i + 1}. {Object.values(r).slice(0, 3).join(" · ")}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {ds && <p className="text-[12px] text-mute">Sloupce: {columns.join(", ")}</p>}
        </div>
      )}
    </Modal>
  );
}

function JsonModal({ open, onClose, data, onApply }: { open: boolean; onClose: () => void; data: DataRecord; onApply: (d: DataRecord) => void }) {
  const [text, setText] = useState("");
  const ref = useRef(false);
  useEffect(() => {
    if (open && !ref.current) {
      const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => !(v && typeof v === "object" && !Array.isArray(v))));
      setText(JSON.stringify(clean, null, 2));
    }
    ref.current = open;
  }, [open, data]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Data jako JSON"
      footer={
        <>
          <Button onClick={onClose}>Zrušit</Button>
          <Button
            variant="primary"
            onClick={() => {
              try {
                const j = parseJson(text);
                if (Array.isArray(j)) throw new Error("Čekám objekt { … }, ne pole.");
                onApply({ ...data, ...(j as DataRecord) });
                onClose();
                toast("Data použita");
              } catch (e) {
                toast((e as Error).message, "bad");
              }
            }}
          >
            Použít
          </Button>
        </>
      }
    >
      <p className="mb-2 text-sm text-mute">Vložte nebo upravte data. Fotky zůstávají beze změny.</p>
      <Textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-[12px]" spellCheck={false} />
    </Modal>
  );
}


function usesTeamLogos(els: TemplateElement[]): boolean {
  return els.some((e) => (e.type === "image" && e.src.trim().startsWith("team:")) || (e.type === "list" && usesTeamLogos(e.children)));
}

/** Týmy použité v grafice, které nemají bílé logo. */
function missingWhite(t: Template, data: DataRecord, teams: Team[]): string[] {
  const names = new Set<string>();
  const add = (v: unknown) => {
    const tm = findTeam(teams, String(v ?? ""));
    if (tm && !tm.logoWhite) names.add(tm.short || tm.name);
  };
  for (const f of t.fields) {
    if (f.type === "team") add(data[f.key]);
    if (f.type === "list" && Array.isArray(data[f.key]))
      for (const r of data[f.key] as Record<string, unknown>[]) for (const c of f.columns ?? []) if (c.type === "team") add(r[c.key]);
  }
  return [...names];
}
