"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GraphicCanvas } from "@/components/GraphicCanvas";
import { DataForm, AssetLibrary, saveImageAsset } from "@/components/DataForm";
import { ColorField, FillField } from "@/components/ColorField";
import { Badge, Button, cx, FileButton, Icon, IconButton, Input, Label, NumberInput, Segmented, Select, Textarea, Toggle, toast, useConfirm } from "@/components/ui";
import { FONT_LIBRARY } from "@/lib/fonts";
import { FORMATS, FORMAT_ORDER } from "@/lib/formats";
import { frameUpdate } from "@/lib/graphic";
import { autoAnchorX, autoAnchorY, framesOverlap, resolveElement } from "@/lib/layout";
import { can } from "@/lib/permissions";
import type { RenderEnv } from "@/lib/render";
import { navigate } from "@/lib/router";
import { uid, upsert, useApp, useAssetMap, useCurrentProject, useCurrentUser } from "@/lib/store";
import type { AnchorX, AnchorY, DataRecord, FieldDef, FieldType, FormatId, Frame, ImageElement, ListElement, Template, TemplateElement, TextElement, Zone } from "@/lib/types";
import { typeIcon } from "./Composer";

type LeftTab = "layers" | "fields" | "sample" | "settings";

const TYPE_LABEL: Record<string, string> = { text: "Text", image: "Obrázek", rect: "Obdélník", ellipse: "Elipsa", line: "Čára", path: "Tvar (SVG)", list: "Seznam řádků" };

export function TemplateEditor({ templateId }: { templateId: string }) {
  const project = useCurrentProject()!;
  const user = useCurrentUser();
  const stored = useApp((s) => s.templates.find((t) => t.id === templateId));
  const assets = useAssetMap(project.id);
  const [t, setT] = useState<Template | undefined>(stored);
  const [past, setPast] = useState<Template[]>([]);
  const [future, setFuture] = useState<Template[]>([]);
  const [dirty, setDirty] = useState(false);
  const [format, setFormat] = useState<FormatId>(stored?.baseFormat ?? "ig_portrait");
  const [sel, setSel] = useState<string | null>(null);
  const [childSel, setChildSel] = useState<string | null>(null);
  const [left, setLeft] = useState<LeftTab>("layers");
  const { confirm, node: confirmNode } = useConfirm();

  useEffect(() => {
    if (stored && !t) setT(stored);
  }, [stored, t]);

  const commit = useCallback((next: Template, record = true) => {
    setT((prev) => {
      if (prev && record) {
        setPast((p) => [...p.slice(-60), prev]);
        setFuture([]);
      }
      return next;
    });
    setDirty(true);
  }, []);

  const undo = () => {
    if (!past.length || !t) return;
    setFuture((f) => [t, ...f]);
    setT(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    setDirty(true);
  };
  const redo = () => {
    if (!future.length || !t) return;
    setPast((p) => [...p, t]);
    setT(future[0]);
    setFuture((f) => f.slice(1));
    setDirty(true);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        removeEl(sel);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const env: RenderEnv | null = useMemo(
    () => (t ? { template: t, data: t.sampleData, format, brand: project.brand, teams: project.teams, assets, placeholders: true, editor: true, page: 1, pages: 2 } : null),
    [t, format, project.brand, project.teams, assets],
  );

  if (!can(user.role, "template.edit")) {
    return (
      <div className="p-8">
        <p className="font-semibold">Šablony může upravovat jen administrátor.</p>
        <Button className="mt-3" onClick={() => navigate("/templates")}>
          Zpět
        </Button>
      </div>
    );
  }
  if (!t || !env) return <div className="p-8 text-mute">Šablona nebyla nalezena.</div>;

  const el = sel ? t.elements.find((e) => e.id === sel) : undefined;

  const updateEl = (id: string, patch: Partial<TemplateElement>, record = true) => {
    commit({ ...t, elements: t.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as TemplateElement) : e)) }, record);
  };
  const updateChild = (listId: string, childId: string, patch: Partial<TemplateElement>) => {
    const L = t.elements.find((e) => e.id === listId) as ListElement;
    updateEl(listId, { children: L.children.map((c) => (c.id === childId ? ({ ...c, ...patch } as TemplateElement) : c)) } as Partial<ListElement>);
  };
  const removeEl = (id: string) => {
    const e = t.elements.find((x) => x.id === id);
    if (!e) return;
    commit({ ...t, elements: t.elements.filter((x) => x.id !== id) });
    setSel(null);
  };
  const moveEl = (id: string, dir: number) => {
    const i = t.elements.findIndex((e) => e.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= t.elements.length) return;
    const n = [...t.elements];
    [n[i], n[j]] = [n[j], n[i]];
    commit({ ...t, elements: n });
  };
  const duplicate = (id: string) => {
    const e = t.elements.find((x) => x.id === id);
    if (!e) return;
    const c = { ...structuredClone(e), id: uid("el-"), name: e.name + " (kopie)", frame: { ...e.frame, x: e.frame.x + 20, y: e.frame.y + 20 } };
    const i = t.elements.indexOf(e);
    const n = [...t.elements];
    n.splice(i + 1, 0, c);
    commit({ ...t, elements: n });
    setSel(c.id);
  };

  const addEl = (type: string) => {
    const base = FORMATS[t.baseFormat];
    const id = uid("el-");
    const cx0 = base.w / 2;
    let e: TemplateElement;
    switch (type) {
      case "text":
        e = { id, name: "Text", type: "text", frame: { x: 80, y: base.h / 2 - 60, w: base.w - 160, h: 120 }, text: "{{title}}", font: "display", size: 110, color: "#FFFFFF", align: "center", maxLines: 2 };
        break;
      case "image":
        e = { id, name: "Fotka", type: "image", frame: { x: 0, y: 0, w: base.w, h: base.h * 0.6 }, src: "{{photo}}", fit: "cover", fallback: "placeholder", zone: "hero" };
        break;
      case "team":
        e = { id, name: "Logo týmu", type: "image", frame: { x: cx0 - 110, y: base.h / 2 - 110, w: 220, h: 220 }, src: "team:{{home_team}}", fit: "contain", fallback: "monogram" };
        break;
      case "logo":
        e = { id, name: "Logo projektu", type: "image", frame: { x: cx0 - 100, y: base.h - 110, w: 200, h: 60 }, src: "brand:logo", fit: "contain", fallback: "none", locked: true };
        break;
      case "rect":
        e = { id, name: "Obdélník", type: "rect", frame: { x: 60, y: base.h - 320, w: base.w - 120, h: 200 }, fill: "@primary", radius: 12 };
        break;
      case "ellipse":
        e = { id, name: "Kruh", type: "ellipse", frame: { x: cx0 - 150, y: base.h / 2 - 150, w: 300, h: 300 }, fill: "@accent" };
        break;
      case "line":
        e = { id, name: "Čára", type: "line", frame: { x: 90, y: base.h / 2, w: base.w - 180, h: 6 }, color: "#FFFFFF", thickness: 4 };
        break;
      case "path":
        e = { id, name: "Linka", type: "path", frame: { x: base.w - 460, y: 0, w: 460, h: 560 }, d: "M100 0 C 78 22, 52 44, 0 100", stroke: "#FFFFFF", strokeWidth: 5 };
        break;
      case "list":
      default:
        e = {
          id,
          name: "Seznam",
          type: "list",
          frame: { x: 60, y: 300, w: base.w - 120, h: 800 },
          field: t.fields.find((f) => f.type === "list")?.key ?? "rows",
          rowHeight: 90,
          gap: 12,
          distribute: false,
          children: [
            { id: uid("c-"), name: "Pozadí", type: "rect", frame: { x: 0, y: 0, w: base.w - 120, h: 90 }, fill: "@dark/60", radius: 10 },
            { id: uid("c-"), name: "Text", type: "text", frame: { x: 24, y: 0, w: base.w - 168, h: 90 }, text: "{{name}}", font: "body", weight: 700, size: 36, color: "#FFFFFF", maxLines: 1 },
          ],
        };
    }
    commit({ ...t, elements: [...t.elements, e] });
    setSel(id);
    setLeft("layers");
  };

  // vlastní obrázky (čáry, pozadí řádků, textury…) jako pevné vrstvy
  const addImages = async (files: File[]) => {
    const base = FORMATS[t.baseFormat];
    let next = t;
    let last = "";
    for (const f of files) {
      const a = await saveImageAsset(f, f.name.replace(/\.\w+$/, ""), "element");
      const ar = (a.w ?? 1) / (a.h ?? 1);
      const w = ar >= base.w / base.h ? base.w : Math.round(base.h * ar);
      const h = Math.round(w / ar);
      const e: TemplateElement = { id: uid("el-"), name: a.name, type: "image", frame: { x: Math.round((base.w - w) / 2), y: Math.round((base.h - h) / 2), w, h }, src: `asset:${a.id}`, fit: "contain", fallback: "none" };
      next = { ...next, elements: [...next.elements, e] };
      last = e.id;
    }
    commit(next);
    setSel(last);
    setChildSel(null);
    toast(files.length > 1 ? `Přidáno ${files.length} obrázků` : "Obrázek přidán – přesuňte ho a zmenšete v náhledu");
  };

  const addField = (f: FieldDef, sample: DataRecord[string], elId: string, patch: Partial<TemplateElement>) => {
    const used = new Set(t.fields.map((x) => x.key));
    let key = f.key;
    let i = 2;
    while (used.has(key)) key = `${f.key}_${i++}`;
    const p = JSON.parse(JSON.stringify(patch).replace(/__KEY__/g, key));
    commit({
      ...t,
      fields: [...t.fields, { ...f, key }],
      sampleData: { ...t.sampleData, [key]: sample },
      elements: t.elements.map((e) => (e.id === elId ? ({ ...e, ...p } as TemplateElement) : e)),
    });
    toast(`Vytvořeno pole „${f.label}“ – najdete ho ve formuláři`);
  };

  const save = async () => {
    await upsert("templates", { ...t, updatedAt: Date.now(), builtIn: false });
    setDirty(false);
    toast("Šablona uložena");
  };

  // překryvy pro aktuální formát (upozornění – nic se nezablokuje)
  const overlaps = overlapWarnings(t, format);

  const interaction = {
    selectedId: sel,
    onSelect: (id: string | null) => {
      setSel(id);
      setChildSel(null);
    },
    selectable: () => true,
    editable: () => true,
    onFrame: (id: string, frame: Frame, done: boolean) => {
      const e = t.elements.find((x) => x.id === id);
      if (!e) return;
      updateEl(id, frameUpdate(e, t, format, frame), done);
    },
  };

  return (
    <div className="flex min-h-full flex-col">
      {confirmNode}
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-20 flex flex-wrap items-center gap-2 border-b border-line bg-white px-4 py-2.5 lg:px-6">
        <IconButton icon="chevronLeft" label="Zpět" onClick={async () => (!dirty || (await confirm("Odejít bez uložení změn?"))) && navigate("/templates")} />
        <Input value={t.name} onChange={(e) => commit({ ...t, name: e.target.value }, false)} className="h-9 max-w-[260px] font-cond text-lg font-bold uppercase" aria-label="Název šablony" />
        {dirty && <Badge tone="warn">neuloženo</Badge>}
        <div className="ml-auto flex items-center gap-1.5">
          <IconButton icon="chevronLeft" label="Zpět (Ctrl+Z)" onClick={undo} disabled={!past.length} />
          <IconButton icon="chevronRight" label="Znovu (Ctrl+Shift+Z)" onClick={redo} disabled={!future.length} />
          <Button size="sm" icon="eye" onClick={() => navigate(`/create/${t.id}`)} disabled={dirty}>
            Použít
          </Button>
          <Button size="sm" variant="primary" icon="check" onClick={save}>
            Uložit
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* LEVÝ PANEL */}
        <aside className="order-2 border-line bg-white lg:order-1 lg:h-[calc(100vh-57px)] lg:overflow-y-auto lg:border-r">
          <div className="sticky top-0 z-10 flex border-b border-line bg-white">
            {(
              [
                ["layers", "Vrstvy"],
                ["fields", "Pole"],
                ["sample", "Data"],
                ["settings", "Šablona"],
              ] as [LeftTab, string][]
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setLeft(k)} className={cx("flex-1 border-b-2 py-2.5 font-cond text-[13px] font-bold uppercase tracking-wide", left === k ? "border-signal text-ink" : "border-transparent text-mute")}>
                {l}
              </button>
            ))}
          </div>
          <div className="p-4">
            {left === "layers" && (
              <div className="space-y-4">
                <div>
                  <Label>Přidat prvek</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      ["text", "Text", "text"],
                      ["image", "Fotka", "image"],
                      ["team", "Logo týmu", "circle"],
                      ["logo", "Logo", "stack"],
                      ["rect", "Plocha", "square"],
                      ["ellipse", "Kruh", "circle"],
                      ["line", "Čára", "line"],
                      ["path", "Linka", "pen"],
                      ["list", "Seznam", "list"],
                    ].map(([k, l, i]) => (
                      <button key={k} type="button" onClick={() => addEl(k)} className="flex flex-col items-center gap-1 rounded-md border border-line py-2 text-[12px] font-semibold hover:border-signal hover:bg-signal-soft">
                        <Icon name={i} size={16} />
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5">
                    <FileButton size="sm" accept="image/*" multiple onFile={addImages}>
                      Vlastní obrázek (PNG, čáry, pozadí…)
                    </FileButton>
                  </div>
                </div>
                <div>
                  <Label hint="nahoře = navrchu">Vrstvy</Label>
                  <div className="rounded-md border border-line">
                    {[...t.elements].reverse().map((e) => (
                      <div key={e.id}>
                        <div className={cx("group flex items-center gap-1 border-b border-line px-2 py-1 last:border-0", sel === e.id && !childSel && "bg-signal-soft")}>
                          <button type="button" onClick={() => (setSel(e.id), setChildSel(null))} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left text-[13px]">
                            <Icon name={typeIcon(e.type)} size={14} className="shrink-0 text-mute" />
                            <span className={cx("truncate", e.hidden && "text-mute line-through")}>{e.name}</span>
                            {e.frames?.[format] && format !== t.baseFormat && <span className="rounded bg-amber-100 px-1 text-[10px] font-bold text-warn">{FORMATS[format].short}</span>}
                          </button>
                          <IconButton icon={e.locked ? "lock" : "unlock"} label={e.locked ? "Odemknout pro editory" : "Zamknout pro editory"} active={e.locked} onClick={() => updateEl(e.id, { locked: !e.locked })} className="h-7 w-7" />
                          <IconButton icon={e.hidden ? "eyeOff" : "eye"} label="Viditelnost" onClick={() => updateEl(e.id, { hidden: !e.hidden })} className="h-7 w-7" />
                        </div>
                        {e.type === "list" && sel === e.id && (
                          <div className="border-b border-line bg-paper/60 py-1 pl-6">
                            {e.children.map((c) => (
                              <button key={c.id} type="button" onClick={() => setChildSel(c.id)} className={cx("flex w-full items-center gap-2 px-2 py-1 text-left text-[12px]", childSel === c.id && "font-bold text-signal")}>
                                <Icon name={typeIcon(c.type)} size={13} className="text-mute" /> {c.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {left === "fields" && <FieldsEditor t={t} commit={commit} />}
            {left === "sample" && (
              <div>
                <p className="mb-3 text-[13px] text-mute">Ukázková data se zobrazí v náhledu a jako výchozí hodnoty při tvorbě grafiky.</p>
                <DataForm template={t} data={t.sampleData} onChange={(d) => commit({ ...t, sampleData: d }, false)} project={project} assets={assets} compact />
              </div>
            )}
            {left === "settings" && <TemplateSettings t={t} commit={commit} brand={project.brand} />}
          </div>
        </aside>

        {/* NÁHLED */}
        <main className="order-1 flex flex-col items-center gap-3 bg-paper px-4 py-5 lg:order-2 lg:h-[calc(100vh-57px)] lg:overflow-y-auto lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {FORMAT_ORDER.filter((f) => t.formats.includes(f)).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={cx("rounded-md border px-2.5 py-1 text-[12px] font-semibold", format === f ? "border-ink bg-ink text-white" : "border-line bg-white text-mute hover:text-ink")}
              >
                {FORMATS[f].short}
                {f === t.baseFormat && " ★"}
              </button>
            ))}
          </div>
          <p className="text-center text-[12px] text-mute">
            {format === t.baseFormat
              ? "Základní formát – ostatní formáty se z něj přepočítají podle kotvení prvků."
              : "Úprava v tomto formátu se uloží jen pro něj (ostatní formáty zůstanou automatické)."}
          </p>
          <GraphicCanvas env={env} interaction={interaction} maxHeight={680} className="w-full" />
          {overlaps.length > 0 && (
            <div className="max-w-xl rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-warn">
              Překrývající se texty v {FORMATS[format].short}: {overlaps.slice(0, 3).join(", ")}
              {overlaps.length > 3 && "…"}. Zkontrolujte, zda je to záměr.
            </div>
          )}
        </main>

        {/* VLASTNOSTI */}
        <aside className="order-3 border-line bg-white p-4 lg:h-[calc(100vh-57px)] lg:overflow-y-auto lg:border-l">
          {el ? (
            childSel && el.type === "list" ? (
              <ElementProps
                key={childSel}
                el={el.children.find((c) => c.id === childSel)!}
                t={t}
                format={format}
                brand={project.brand}
                isChild
                onChange={(p) => updateChild(el.id, childSel, p)}
                onRemove={() => updateEl(el.id, { children: el.children.filter((c) => c.id !== childSel) } as Partial<ListElement>)}
                project={project}
              />
            ) : (
              <ElementProps
                key={el.id}
                el={el}
                t={t}
                format={format}
                brand={project.brand}
                onChange={(p) => updateEl(el.id, p)}
                onRemove={() => removeEl(el.id)}
                onDuplicate={() => duplicate(el.id)}
                addField={(f, sample, patch) => addField(f, sample, el.id, patch)}
                onMove={(d) => moveEl(el.id, d)}
                project={project}
                onAddChild={
                  el.type === "list"
                    ? (type) => {
                        const c: TemplateElement =
                          type === "text"
                            ? { id: uid("c-"), name: "Text", type: "text", frame: { x: 0, y: 0, w: el.frame.w / 2, h: el.rowHeight }, text: "{{name}}", font: "body", weight: 700, size: 32, color: "#FFFFFF", maxLines: 1 }
                            : type === "team"
                              ? { id: uid("c-"), name: "Logo", type: "image", frame: { x: 10, y: 8, w: el.rowHeight - 16, h: el.rowHeight - 16 }, src: "team:{{team}}", fit: "contain", fallback: "monogram" }
                              : { id: uid("c-"), name: "Plocha", type: "rect", frame: { x: 0, y: 0, w: el.frame.w, h: el.rowHeight }, fill: "@dark/50", radius: 8 };
                        updateEl(el.id, { children: [...el.children, c] } as Partial<ListElement>);
                        setChildSel(c.id);
                      }
                    : undefined
                }
              />
            )
          ) : (
            <div className="space-y-3 text-sm text-mute">
              <p className="font-cond text-sm font-bold uppercase tracking-wide text-ink">Vlastnosti</p>
              <p>Vyberte prvek v náhledu nebo ve vrstvách.</p>
              <ul className="list-disc space-y-1 pl-4 text-[13px]">
                <li>Text pište s proměnnými, např. <code className="rounded bg-paper px-1">{"{{home_team|upper}}"}</code></li>
                <li>Filtry: upper, lower, short (zkratka týmu), day (den v týdnu), date, date:short</li>
                <li>[Slova v závorkách] se obarví zvýrazňovací barvou</li>
                <li>Zámek = editor prvek nemůže měnit</li>
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function overlapWarnings(t: Template, format: FormatId) {
  {
    const texts = t.elements.filter((e) => e.type === "text" && !e.hidden && !e.hideIn?.includes(format));
    const out: string[] = [];
    for (let i = 0; i < texts.length; i++)
      for (let j = i + 1; j < texts.length; j++) {
        const a = resolveElement(texts[i], t, format).frame;
        const b = resolveElement(texts[j], t, format).frame;
        const inter = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
        if (framesOverlap(a, b) && inter > Math.min(a.w * a.h, b.w * b.h) * 0.25) out.push(`${texts[i].name} × ${texts[j].name}`);
      }
    return out;
  }
}

// ── Vlastnosti prvku ─────────────────────────────────────────

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5 border-t border-line pt-3">
      <p className="font-cond text-[12px] font-bold uppercase tracking-[0.1em] text-mute">{title}</p>
      {children}
    </div>
  );
}

function ElementProps({
  el,
  t,
  format,
  brand,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
  isChild,
  project,
  onAddChild,
  addField,
}: {
  el: TemplateElement;
  t: Template;
  format: FormatId;
  brand: import("@/lib/types").BrandKit;
  onChange: (p: Partial<TemplateElement>) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  onMove?: (d: number) => void;
  isChild?: boolean;
  project: import("@/lib/types").Project;
  onAddChild?: (type: string) => void;
  addField?: (f: FieldDef, sample: DataRecord[string], patch: Partial<TemplateElement>) => void;
}) {
  const base = FORMATS[t.baseFormat];
  const inBase = isChild || format === t.baseFormat;
  const frame = inBase ? el.frame : el.frames?.[format] ?? resolveElement(el, t, format).frame;
  const setFrame = (k: keyof Frame, v: number) => {
    const f = { ...frame, [k]: v };
    onChange(inBase ? { frame: f } : { frames: { ...(el.frames ?? {}), [format]: f } });
  };
  const [lib, setLib] = useState(false);
  const textFields = t.fields;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <Icon name={typeIcon(el.type)} size={16} className="text-mute" />
        <Input value={el.name} onChange={(e) => onChange({ name: e.target.value })} className="h-8 flex-1 text-sm font-semibold" aria-label="Název prvku" />
      </div>
      <div className="flex flex-wrap gap-1">
        <Badge>{TYPE_LABEL[el.type]}</Badge>
        {isChild && <Badge tone="signal">řádek seznamu</Badge>}
        {!inBase && <Badge tone="warn">{el.frames?.[format] ? `ruční ${FORMATS[format].short}` : `auto ${FORMATS[format].short}`}</Badge>}
      </div>
      <div className="flex flex-wrap gap-1">
        {onMove && (
          <>
            <IconButton icon="up" label="Posunout nahoru (před)" onClick={() => onMove(1)} />
            <IconButton icon="down" label="Posunout dolů (za)" onClick={() => onMove(-1)} />
          </>
        )}
        {onDuplicate && <IconButton icon="copy" label="Duplikovat" onClick={onDuplicate} />}
        <IconButton icon="trash" label="Smazat" onClick={onRemove} />
      </div>

      <Section title={isChild ? "Pozice v řádku" : `Pozice (${inBase ? FORMATS[t.baseFormat].short + " základ" : FORMATS[format].short})`}>
        <Row>
          {(["x", "y", "w", "h"] as const).map((k) => (
            <label key={k} className="flex items-center gap-1.5 text-[12px] font-semibold uppercase text-mute">
              {k === "w" ? "Š" : k === "h" ? "V" : k.toUpperCase()}
              <NumberInput value={frame[k]} onChange={(v) => setFrame(k, v)} />
            </label>
          ))}
        </Row>
        {!inBase && el.frames?.[format] && (
          <Button size="sm" variant="ghost" icon="refresh" onClick={() => {
            const f = { ...(el.frames ?? {}) };
            delete f[format];
            onChange({ frames: f });
          }}>
            Vrátit automatické rozložení
          </Button>
        )}
      </Section>

      {!isChild && (
        <Section title="Chování při změně formátu">
          <Row>
            <div>
              <Label>Vodorovně</Label>
              <Select value={el.anchorX ?? ""} onChange={(e) => onChange({ anchorX: (e.target.value || undefined) as AnchorX })}>
                <option value="">Auto ({ax(autoAnchorX(el.frame, base.w))})</option>
                <option value="left">Vlevo</option>
                <option value="center">Na střed</option>
                <option value="right">Vpravo</option>
                <option value="stretch">Roztáhnout</option>
                <option value="scale">Poměrně</option>
              </Select>
            </div>
            <div>
              <Label>Svisle</Label>
              <Select value={el.anchorY ?? ""} onChange={(e) => onChange({ anchorY: (e.target.value || undefined) as AnchorY })}>
                <option value="">Auto ({ax(autoAnchorY(el.frame, base.h))})</option>
                <option value="top">Nahoru</option>
                <option value="center">Na střed</option>
                <option value="bottom">Dolů</option>
                <option value="stretch">Roztáhnout</option>
                <option value="scale">Poměrně</option>
              </Select>
            </div>
          </Row>
          <div>
            <Label hint="pro formát na šířku 16:9">Zóna</Label>
            <Select value={el.zone ?? "content"} onChange={(e) => onChange({ zone: e.target.value as Zone })}>
              <option value="content">Obsah (přeskládá se doprava)</option>
              <option value="hero">Hlavní fotka (přesune se doleva)</option>
              <option value="bg">Pozadí (přes celou plochu)</option>
            </Select>
          </div>
          <div>
            <Label>Skrýt ve formátech</Label>
            <div className="flex flex-wrap gap-1">
              {FORMAT_ORDER.map((f) => {
                const on = el.hideIn?.includes(f);
                return (
                  <button key={f} type="button" onClick={() => onChange({ hideIn: on ? el.hideIn!.filter((x) => x !== f) : [...(el.hideIn ?? []), f] })} className={cx("rounded border px-2 py-0.5 text-[12px] font-semibold", on ? "border-bad bg-red-50 text-bad" : "border-line text-mute")}>
                    {FORMATS[f].short}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>
      )}

      {el.type === "text" && (
        <>
          {addField && !/\{\{/.test(el.text) && (
            <Button size="sm" icon="text" onClick={() => addField({ key: el.name || "text", label: el.name || "Text", type: el.text.includes("\n") ? "longtext" : "text" }, el.text, { text: "{{__KEY__}}" } as Partial<TemplateElement>)}>
              Udělat z textu pole formuláře
            </Button>
          )}
          <TextProps el={el} onChange={onChange} brand={brand} fields={textFields} />
        </>
      )}
      {el.type === "image" && (
        <Section title="Obrázek">
          <div>
            <Label>Zdroj</Label>
            <Select
              value={srcKind(el.src)}
              onChange={(e) => {
                const k = e.target.value;
                const firstImg = t.fields.find((f) => f.type === "image")?.key ?? "photo";
                const firstTeam = t.fields.find((f) => f.type === "team")?.key ?? "home_team";
                onChange({ src: k === "field" ? `{{${firstImg}}}` : k === "team" ? `team:{{${firstTeam}}}` : k === "brand" ? "brand:logo" : "asset:" } as Partial<ImageElement>);
              }}
            >
              <option value="field">Z datového pole (fotka)</option>
              <option value="team">Logo týmu podle pole</option>
              <option value="brand">Z brand kitu</option>
              <option value="asset">Pevný obrázek</option>
            </Select>
          </div>
          {srcKind(el.src) === "field" && (
            <Select value={el.src.replace(/[{}]/g, "")} onChange={(e) => onChange({ src: `{{${e.target.value}}}` } as Partial<ImageElement>)} aria-label="Pole">
              {t.fields.filter((f) => f.type === "image").map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </Select>
          )}
          {srcKind(el.src) === "team" && (
            <Input value={el.src.slice(5)} onChange={(e) => onChange({ src: "team:" + e.target.value } as Partial<ImageElement>)} className="font-mono text-[12px]" aria-label="Pole týmu" />
          )}
          {srcKind(el.src) === "brand" && (
            <Select value={el.src.slice(6)} onChange={(e) => onChange({ src: "brand:" + e.target.value } as Partial<ImageElement>)} aria-label="Prvek brand kitu">
              <option value="logo">Logo</option>
              <option value="logoAlt">Alternativní logo</option>
              <option value="partner">Partner / liga</option>
              {brand.backgrounds.map((_, i) => <option key={i} value={`bg${i}`}>Pozadí {i + 1}</option>)}
              {brand.elements.map((_, i) => <option key={i} value={`el${i}`}>Grafický prvek {i + 1}</option>)}
            </Select>
          )}
          {srcKind(el.src) === "asset" && (
            <>
              <div className="flex flex-wrap gap-1.5">
                <FileButton size="sm" accept="image/*" onFile={async (f) => {
                  const a = await saveImageAsset(f[0], f[0].name.replace(/\.\w+$/, ""), "element");
                  onChange({ src: "asset:" + a.id } as Partial<ImageElement>);
                }}>Nahrát obrázek</FileButton>
                <Button size="sm" icon="grid" onClick={() => setLib(true)}>Z knihovny</Button>
              </div>
              <AssetLibrary open={lib} onClose={() => setLib(false)} project={project} onPick={(a) => onChange({ src: "asset:" + a } as Partial<ImageElement>)} />
              {addField && (
                <div className="flex flex-wrap gap-1.5 rounded-md bg-paper p-2">
                  <span className="w-full text-[11px] font-semibold uppercase text-mute">Měnit při každé grafice?</span>
                  <Button size="sm" icon="image" onClick={() => addField({ key: "photo", label: el.name || "Fotka", type: "image" }, el.src.slice(6) ? { asset: el.src.slice(6), zoom: 1, fx: 0.5, fy: 0.5 } : null, { src: "{{__KEY__}}", fallback: "placeholder" } as Partial<ImageElement>)}>
                    Udělat z toho fotku
                  </Button>
                  <Button size="sm" icon="circle" onClick={() => addField({ key: "team", label: "Tým", type: "team" }, "", { src: "team:{{__KEY__}}", fit: "contain", fallback: "monogram" } as Partial<ImageElement>)}>
                    Logo týmu
                  </Button>
                </div>
              )}
            </>
          )}
          <Row>
            <div>
              <Label>Přizpůsobení</Label>
              <Segmented size="sm" value={el.fit ?? "cover"} onChange={(v) => onChange({ fit: v } as Partial<ImageElement>)} options={[{ value: "cover", label: "Vyplnit" }, { value: "contain", label: "Celý" }]} />
            </div>
            <div>
              <Label>Rádius</Label>
              <NumberInput value={el.radius ?? 0} onChange={(v) => onChange({ radius: v } as Partial<ImageElement>)} />
            </div>
          </Row>
          {el.fit === "contain" && (
            <Row>
              <Select value={el.align ?? "center"} onChange={(e) => onChange({ align: e.target.value } as Partial<ImageElement>)} aria-label="Vodorovné zarovnání">
                <option value="left">Vlevo</option><option value="center">Na střed</option><option value="right">Vpravo</option>
              </Select>
              <Select value={el.valign ?? "middle"} onChange={(e) => onChange({ valign: e.target.value } as Partial<ImageElement>)} aria-label="Svislé zarovnání">
                <option value="top">Nahoru</option><option value="middle">Na střed</option><option value="bottom">Dolů</option>
              </Select>
            </Row>
          )}
          <div>
            <Label>Když obrázek chybí</Label>
            <Select value={el.fallback ?? "placeholder"} onChange={(e) => onChange({ fallback: e.target.value } as Partial<ImageElement>)}>
              <option value="placeholder">Zobrazit místo pro fotku (jen náhled)</option>
              <option value="monogram">Monogram týmu</option>
              <option value="none">Nic</option>
            </Select>
          </div>
          <Toggle checked={!!el.grayscale} onChange={(v) => onChange({ grayscale: v } as Partial<ImageElement>)} label="Černobíle" />
          <Toggle checked={!!el.tint} onChange={(v) => onChange({ tint: v ? "#FFFFFF" : undefined } as Partial<ImageElement>)} label="Přebarvit (např. bílé logo)" />
          {el.tint && <ColorField value={el.tint} onChange={(v) => onChange({ tint: v } as Partial<ImageElement>)} brand={brand} />}
        </Section>
      )}
      {(el.type === "rect" || el.type === "ellipse") && (
        <Section title="Výplň">
          <FillField label="Výplň" value={el.fill} onChange={(f) => onChange({ fill: f } as Partial<TemplateElement>)} brand={brand} />
          {el.type === "rect" && (
            <div>
              <Label>Zaoblení</Label>
              <NumberInput value={el.radius ?? 0} onChange={(v) => onChange({ radius: v } as Partial<TemplateElement>)} />
            </div>
          )}
        </Section>
      )}
      {el.type === "line" && (
        <Section title="Čára">
          <ColorField label="Barva" value={el.color} onChange={(v) => onChange({ color: v } as Partial<TemplateElement>)} brand={brand} />
          <div>
            <Label>Tloušťka</Label>
            <NumberInput value={el.thickness} onChange={(v) => onChange({ thickness: v } as Partial<TemplateElement>)} />
          </div>
        </Section>
      )}
      {el.type === "path" && (
        <Section title="Tvar">
          <div>
            <Label hint="viewBox 0–100">SVG path</Label>
            <Textarea rows={3} value={el.d} onChange={(e) => onChange({ d: e.target.value } as Partial<TemplateElement>)} className="font-mono text-[12px]" />
          </div>
          <ColorField label="Obrys" value={el.stroke ?? ""} onChange={(v) => onChange({ stroke: v } as Partial<TemplateElement>)} brand={brand} />
          <div>
            <Label>Tloušťka obrysu</Label>
            <NumberInput value={el.strokeWidth ?? 0} onChange={(v) => onChange({ strokeWidth: v } as Partial<TemplateElement>)} />
          </div>
          <Toggle checked={!!el.fill} onChange={(v) => onChange({ fill: v ? "@accent" : undefined } as Partial<TemplateElement>)} label="Výplň" />
          {el.fill && <FillField label="Výplň" value={el.fill} onChange={(f) => onChange({ fill: f } as Partial<TemplateElement>)} brand={brand} />}
        </Section>
      )}
      {el.type === "list" && (
        <Section title="Seznam">
          <div>
            <Label>Datové pole</Label>
            <Select value={el.field} onChange={(e) => onChange({ field: e.target.value } as Partial<TemplateElement>)}>
              {t.fields.filter((f) => f.type === "list").map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </Select>
          </div>
          <Row>
            <div>
              <Label>Výška řádku</Label>
              <NumberInput value={el.rowHeight} onChange={(v) => onChange({ rowHeight: Math.max(10, v) } as Partial<TemplateElement>)} />
            </div>
            <div>
              <Label>Mezera</Label>
              <NumberInput value={el.gap} onChange={(v) => onChange({ gap: v } as Partial<TemplateElement>)} />
            </div>
          </Row>
          <div>
            <Label hint="0 = bez limitu">Max. řádků</Label>
            <NumberInput value={el.maxRows ?? 0} onChange={(v) => onChange({ maxRows: v || undefined } as Partial<TemplateElement>)} />
          </div>
          <Toggle checked={!!el.distribute} onChange={(v) => onChange({ distribute: v } as Partial<TemplateElement>)} label="Rozprostřít řádky do výšky" />
          <p className="text-[12px] text-mute">Když se řádky nevejdou, automaticky se zmenší. Prvky řádku vyberete ve Vrstvách.</p>
          {onAddChild && (
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" icon="text" onClick={() => onAddChild("text")}>+ text</Button>
              <Button size="sm" icon="circle" onClick={() => onAddChild("team")}>+ logo</Button>
              <Button size="sm" icon="square" onClick={() => onAddChild("rect")}>+ plocha</Button>
            </div>
          )}
        </Section>
      )}

      <Section title="Obecné">
        <div>
          <Label hint={`${Math.round((el.opacity ?? 1) * 100)} %`}>Krytí</Label>
          <input type="range" min={0} max={1} step={0.01} value={el.opacity ?? 1} onChange={(e) => onChange({ opacity: Number(e.target.value) })} className="w-full accent-[#2A4BFF]" aria-label="Krytí" />
        </div>
        <Row>
          <div>
            <Label>Otočení °</Label>
            <NumberInput value={el.rotation ?? 0} onChange={(v) => onChange({ rotation: v })} />
          </div>
          <div>
            <Label>Zobrazit jen když</Label>
            <Select value={el.showIf ?? ""} onChange={(e) => onChange({ showIf: e.target.value || undefined })}>
              <option value="">vždy</option>
              {t.fields.map((f) => <option key={f.key} value={f.key}>{f.label} vyplněno</option>)}
            </Select>
          </div>
        </Row>
        <Toggle checked={!!el.fade} onChange={(v) => onChange({ fade: v ? { angle: 90, from: 0.4, to: 0.8 } : undefined })} label="Přechod do průhledna (maska)" />
        {el.fade && (
          <div className="space-y-2 rounded-md border border-line p-2">
            <Select value={el.fade.angle} onChange={(e) => onChange({ fade: { ...el.fade!, angle: Number(e.target.value) } })} aria-label="Směr přechodu">
              <option value={90}>Průhledné nahoře → plné dole</option>
              <option value={270}>Průhledné dole → plné nahoře</option>
              <option value={0}>Průhledné vlevo → plné vpravo</option>
              <option value={180}>Průhledné vpravo → plné vlevo</option>
            </Select>
            <label className="flex items-center gap-2 text-[12px] text-mute">Začátek<input type="range" min={0} max={1} step={0.01} value={el.fade.from} onChange={(e) => onChange({ fade: { ...el.fade!, from: Number(e.target.value) } })} className="flex-1 accent-[#2A4BFF]" /></label>
            <label className="flex items-center gap-2 text-[12px] text-mute">Konec<input type="range" min={0} max={1} step={0.01} value={el.fade.to} onChange={(e) => onChange({ fade: { ...el.fade!, to: Number(e.target.value) } })} className="flex-1 accent-[#2A4BFF]" /></label>
          </div>
        )}
        <Toggle checked={!!el.shadow} onChange={(v) => onChange({ shadow: v ? { color: "rgba(0,0,0,0.45)", blur: 30, x: 0, y: 10 } : undefined })} label="Stín" />
        {el.shadow && (
          <Row>
            <label className="flex items-center gap-1.5 text-[12px] text-mute">Rozostření<NumberInput value={el.shadow.blur} onChange={(v) => onChange({ shadow: { ...el.shadow!, blur: v } })} /></label>
            <label className="flex items-center gap-1.5 text-[12px] text-mute">Posun Y<NumberInput value={el.shadow.y} onChange={(v) => onChange({ shadow: { ...el.shadow!, y: v } })} /></label>
          </Row>
        )}
        {!isChild && <Toggle checked={!!el.locked} onChange={(v) => onChange({ locked: v })} label="Zamknout pro editory" />}
      </Section>
    </div>
  );
}

function ax(a: string) {
  return { left: "vlevo", right: "vpravo", center: "střed", stretch: "roztáhnout", top: "nahoru", bottom: "dolů", scale: "poměrně" }[a] ?? a;
}
function srcKind(src: string) {
  if (src.startsWith("team:")) return "team";
  if (src.startsWith("brand:")) return "brand";
  if (src.startsWith("asset:")) return "asset";
  return "field";
}

function TextProps({ el, onChange, brand, fields }: { el: TextElement; onChange: (p: Partial<TemplateElement>) => void; brand: import("@/lib/types").BrandKit; fields: FieldDef[] }) {
  const p = (x: Partial<TextElement>) => onChange(x as Partial<TemplateElement>);
  return (
    <Section title="Text">
      <div>
        <Label hint="{{pole}}">Obsah</Label>
        <Textarea rows={2} value={el.text} onChange={(e) => p({ text: e.target.value })} className="font-mono text-[13px]" />
        <div className="mt-1 flex flex-wrap gap-1">
          {fields.filter((f) => f.type !== "image" && f.type !== "list").slice(0, 12).map((f) => (
            <button key={f.key} type="button" onClick={() => p({ text: `${el.text}{{${f.key}}}` })} className="rounded bg-paper px-1.5 py-0.5 text-[11px] font-semibold text-mute hover:bg-signal-soft hover:text-signal-ink">
              +{f.key}
            </button>
          ))}
        </div>
      </div>
      <Row>
        <div>
          <Label>Písmo</Label>
          <Select value={el.font} onChange={(e) => p({ font: e.target.value })}>
            <optgroup label="Brand kit">
              <option value="display">Nadpisové ({brand.fonts.display.family})</option>
              <option value="body">Textové ({brand.fonts.body.family})</option>
              <option value="accent">Doplňkové ({brand.fonts.accent.family})</option>
            </optgroup>
            <optgroup label="Konkrétní font">
              {FONT_LIBRARY.map((f) => <option key={f.family} value={f.family}>{f.family}</option>)}
            </optgroup>
          </Select>
        </div>
        <div>
          <Label>Řez</Label>
          <Select value={el.weight ?? 400} onChange={(e) => p({ weight: Number(e.target.value) })}>
            {[400, 500, 600, 700, 800, 900].map((w) => <option key={w} value={w}>{w}</option>)}
          </Select>
        </div>
      </Row>
      <Row>
        <div>
          <Label>Max. velikost</Label>
          <NumberInput value={el.size} onChange={(v) => p({ size: Math.max(4, v) })} />
        </div>
        <div>
          <Label>Min. velikost</Label>
          <NumberInput value={el.minSize ?? Math.round(el.size * 0.35)} onChange={(v) => p({ minSize: v })} />
        </div>
      </Row>
      <Row>
        <div>
          <Label>Max. řádků</Label>
          <NumberInput value={el.maxLines ?? 3} min={1} onChange={(v) => p({ maxLines: Math.max(1, v) })} />
        </div>
        <div>
          <Label>Proklad</Label>
          <NumberInput value={el.lineHeight ?? 1.05} step={0.05} onChange={(v) => p({ lineHeight: v })} />
        </div>
      </Row>
      <ColorField label="Barva" value={el.color} onChange={(v) => p({ color: v })} brand={brand} />
      <div className="flex flex-wrap gap-2">
        <Segmented size="sm" value={el.align ?? "left"} onChange={(v) => p({ align: v })} options={[{ value: "left", label: "⟸" }, { value: "center", label: "≡" }, { value: "right", label: "⟹" }]} />
        <Segmented size="sm" value={el.valign ?? "middle"} onChange={(v) => p({ valign: v })} options={[{ value: "top", label: "Nahoru" }, { value: "middle", label: "Střed" }, { value: "bottom", label: "Dolů" }]} />
      </div>
      <div>
        <Label hint="em">Prostrkání</Label>
        <NumberInput value={el.letterSpacing ?? 0} step={0.01} onChange={(v) => p({ letterSpacing: v })} />
      </div>
      <Toggle checked={!!el.uppercase} onChange={(v) => p({ uppercase: v })} label="VERZÁLKY" />
      <Toggle checked={!!el.italic} onChange={(v) => p({ italic: v })} label="Kurzíva" />
      <Toggle checked={!!el.vertical} onChange={(v) => p({ vertical: v })} label="Svisle (otočeno)" />
      <Toggle checked={!!el.highlight} onChange={(v) => p({ highlight: v ? "@accent" : undefined })} label="Zvýraznění [slov v závorkách]" />
      {el.highlight && <ColorField value={el.highlight} onChange={(v) => p({ highlight: v })} brand={brand} />}
      <Toggle checked={!!el.pill} onChange={(v) => p({ pill: v ? { fill: "@accent", padX: 20, padY: 10, radius: 6 } : undefined })} label="Štítek pod textem" />
      {el.pill && (
        <div className="space-y-2 rounded-md border border-line p-2">
          <FillField label="Barva štítku" value={el.pill.fill} onChange={(f) => p({ pill: { ...el.pill!, fill: f } })} brand={brand} />
          <Row>
            <label className="flex items-center gap-1.5 text-[12px] text-mute">Okraj X<NumberInput value={el.pill.padX} onChange={(v) => p({ pill: { ...el.pill!, padX: v } })} /></label>
            <label className="flex items-center gap-1.5 text-[12px] text-mute">Rádius<NumberInput value={el.pill.radius} onChange={(v) => p({ pill: { ...el.pill!, radius: v } })} /></label>
          </Row>
        </div>
      )}
      <Toggle checked={!!el.strokeText} onChange={(v) => p({ strokeText: v ? { color: "@accent", width: 4 } : undefined, color: v ? "rgba(0,0,0,0)" : "#FFFFFF" })} label="Obrysové písmo" />
      {el.strokeText && <ColorField value={el.strokeText.color} onChange={(v) => p({ strokeText: { ...el.strokeText!, color: v } })} brand={brand} />}
    </Section>
  );
}

// ── Datová pole šablony ─────────────────────────────────────

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "longtext", label: "Delší text" },
  { value: "number", label: "Číslo" },
  { value: "team", label: "Tým (načte logo)" },
  { value: "date", label: "Datum" },
  { value: "image", label: "Fotka" },
  { value: "list", label: "Seznam / tabulka" },
  { value: "select", label: "Výběr" },
];

function FieldsEditor({ t, commit }: { t: Template; commit: (t: Template, record?: boolean) => void }) {
  const setFields = (fields: FieldDef[]) => commit({ ...t, fields });
  const upd = (i: number, p: Partial<FieldDef>) => setFields(t.fields.map((f, j) => (j === i ? { ...f, ...p } : f)));
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-mute">Datová pole jsou vstupy formuláře. V prvcích se na ně odkazuje jako {"{{klíč}}"}.</p>
      {t.fields.map((f, i) => (
        <div key={i} className="space-y-2 rounded-md border border-line p-2.5">
          <Row>
            <Input value={f.label} onChange={(e) => upd(i, { label: e.target.value })} className="h-8 text-sm" aria-label="Popisek" />
            <Input value={f.key} onChange={(e) => upd(i, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "_") })} className="h-8 font-mono text-[12px]" aria-label="Klíč" />
          </Row>
          <div className="flex items-center gap-1.5">
            <div className="flex-1">
              <Select value={f.type} onChange={(e) => upd(i, { type: e.target.value as FieldType, columns: e.target.value === "list" ? f.columns ?? [{ key: "name", label: "Název", type: "text" }] : f.columns })} aria-label="Typ pole">
                {FIELD_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </Select>
            </div>
            <IconButton icon="up" label="Nahoru" disabled={i === 0} onClick={() => {
              const n = [...t.fields];
              [n[i - 1], n[i]] = [n[i], n[i - 1]];
              setFields(n);
            }} />
            <IconButton icon="trash" label="Smazat pole" onClick={() => setFields(t.fields.filter((_, j) => j !== i))} />
          </div>
          {f.type === "select" && (
            <Input value={(f.options ?? []).join(", ")} onChange={(e) => upd(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="Možnosti oddělené čárkou" className="h-8 text-sm" />
          )}
          {f.type === "list" && (
            <div className="space-y-1.5 rounded bg-paper p-2">
              <p className="text-[11px] font-bold uppercase text-mute">Sloupce</p>
              {(f.columns ?? []).map((c, ci) => (
                <div key={ci} className="flex gap-1">
                  <Input value={c.label} onChange={(e) => upd(i, { columns: f.columns!.map((x, k) => (k === ci ? { ...x, label: e.target.value } : x)) })} className="h-7 text-[12px]" aria-label="Popisek sloupce" />
                  <Input value={c.key} onChange={(e) => upd(i, { columns: f.columns!.map((x, k) => (k === ci ? { ...x, key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "_") } : x)) })} className="h-7 font-mono text-[11px]" aria-label="Klíč sloupce" />
                  <select value={c.type} onChange={(e) => upd(i, { columns: f.columns!.map((x, k) => (k === ci ? { ...x, type: e.target.value as FieldType } : x)) })} className="h-7 rounded border border-line text-[11px]" aria-label="Typ sloupce">
                    {["text", "number", "team", "date"].map((x) => <option key={x}>{x}</option>)}
                  </select>
                  <button type="button" className="px-1 text-bad" onClick={() => upd(i, { columns: f.columns!.filter((_, k) => k !== ci) })} aria-label="Smazat sloupec">×</button>
                </div>
              ))}
              <button type="button" className="text-[12px] font-semibold text-signal" onClick={() => upd(i, { columns: [...(f.columns ?? []), { key: `col${(f.columns?.length ?? 0) + 1}`, label: "Sloupec", type: "text" }] })}>
                + sloupec
              </button>
            </div>
          )}
        </div>
      ))}
      <Button size="sm" icon="plus" onClick={() => setFields([...t.fields, { key: `pole_${t.fields.length + 1}`, label: "Nové pole", type: "text" }])}>
        Přidat pole
      </Button>
    </div>
  );
}

function TemplateSettings({ t, commit, brand }: { t: Template; commit: (t: Template, record?: boolean) => void; brand: import("@/lib/types").BrandKit }) {
  const lists = t.fields.filter((f) => f.type === "list");
  return (
    <div className="space-y-4">
      <div>
        <Label>Kategorie</Label>
        <Input value={t.category} onChange={(e) => commit({ ...t, category: e.target.value }, false)} />
      </div>
      <div>
        <Label>Popis</Label>
        <Textarea rows={2} value={t.description ?? ""} onChange={(e) => commit({ ...t, description: e.target.value }, false)} />
      </div>
      <FillField label="Pozadí plátna" value={t.background} onChange={(f) => commit({ ...t, background: f })} brand={brand} />
      <div>
        <Label>Základní formát</Label>
        <Select value={t.baseFormat} onChange={(e) => commit({ ...t, baseFormat: e.target.value as FormatId })}>
          {FORMAT_ORDER.map((f) => <option key={f} value={f}>{FORMATS[f].label} {FORMATS[f].w}×{FORMATS[f].h}</option>)}
        </Select>
        <p className="mt-1 text-[12px] text-mute">Souřadnice prvků jsou v tomto formátu. Změnu dělejte ideálně u nové šablony.</p>
      </div>
      <div>
        <Label>Povolené formáty</Label>
        <div className="flex flex-wrap gap-1">
          {FORMAT_ORDER.map((f) => {
            const on = t.formats.includes(f);
            return (
              <button key={f} type="button" disabled={f === t.baseFormat} onClick={() => commit({ ...t, formats: on ? t.formats.filter((x) => x !== f) : FORMAT_ORDER.filter((x) => x === f || t.formats.includes(x)) })} className={cx("rounded border px-2 py-1 text-[12px] font-semibold", on ? "border-ink bg-ink text-white" : "border-line text-mute")}>
                {FORMATS[f].short}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-2 rounded-md border border-line p-3">
        <Toggle checked={!!t.paginate} disabled={!lists.length} onChange={(v) => commit({ ...t, paginate: v ? { field: lists[0].key, perPage: 4 } : undefined })} label="Carousel – rozdělit seznam na slidy" />
        {!lists.length && <p className="text-[12px] text-mute">Nejdřív přidejte pole typu Seznam.</p>}
        {t.paginate && (
          <Row>
            <Select value={t.paginate.field} onChange={(e) => commit({ ...t, paginate: { ...t.paginate!, field: e.target.value } })} aria-label="Seznam">
              {lists.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </Select>
            <label className="flex items-center gap-1.5 text-[12px] text-mute">
              na slide
              <NumberInput value={t.paginate.perPage} min={1} onChange={(v) => commit({ ...t, paginate: { ...t.paginate!, perPage: Math.max(1, v) } })} />
            </label>
          </Row>
        )}
        <p className="text-[12px] text-mute">V textu použijte {"{{page}}"} a {"{{pages}}"} pro číslo slidu.</p>
      </div>
    </div>
  );
}
