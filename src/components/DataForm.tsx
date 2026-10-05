"use client";
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { browserRemover, removeBgRemover } from "@/lib/bg-removal";
import { parseCsv, parseResultLines, parseScheduleLines, toRows } from "@/lib/data-import";
import { asImageValue, clamp } from "@/lib/graphic";
import { dataUrlToBlob, fileToDataUrl, importImageFile } from "@/lib/images";
import { getState, uid, upsert, useApp } from "@/lib/store";
import { findTeam } from "@/lib/template-string";
import type { Asset, Channel, DataRecord, FieldDef, ImageValue, Project, Template } from "@/lib/types";
import { Button, cx, FileButton, Icon, IconButton, Input, Label, Modal, Segmented, Select, Spinner, Textarea, toast } from "./ui";

export function DataForm({
  template,
  data,
  onChange,
  project,
  assets,
  readOnlyField,
  compact,
  activeRow,
  onActiveRow,
}: {
  template: Template;
  data: DataRecord;
  onChange: (d: DataRecord) => void;
  project: Project;
  assets: Record<string, string>;
  readOnlyField?: (f: FieldDef) => boolean;
  compact?: boolean;
  /** carousel: řádek, který je právě v náhledu */
  activeRow?: number;
  onActiveRow?: (i: number) => void;
}) {
  const set = (k: string, v: DataRecord[string]) => onChange({ ...data, [k]: v });
  // pole, jejichž fotka se kreslí i vyříznutá v popředí (hráč před pásem)
  const cutKeys = new Set<string>();
  const scan = (els: Template["elements"]) =>
    els.forEach((e) => {
      if (e.type === "image" && e.useCutout) {
        const m = /^\{\{([^}|]+)/.exec(e.src.trim());
        if (m) cutKeys.add(m[1].trim());
      }
      if (e.type === "list") scan(e.children);
    });
  scan(template.elements);
  return (
    <div className={cx("flex flex-col", compact ? "gap-3" : "gap-4")}>
      <datalist id="team-list">
        {project.teams.map((t) => (
          <option key={t.id} value={t.name} />
        ))}
      </datalist>
      {template.fields.map((f) => {
        const ro = readOnlyField?.(f) ?? false;
        const id = `fld-${f.key}`;
        const v = data[f.key];
        return (
          <div key={f.key}>
            <Label htmlFor={id} hint={ro ? "zamčeno" : f.help}>
              {f.label}
            </Label>
            {f.type === "longtext" ? (
              <Textarea id={id} rows={3} disabled={ro} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
            ) : f.type === "number" ? (
              <Input id={id} inputMode="numeric" disabled={ro} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} className="tabular-nums" />
            ) : f.type === "date" ? (
              <Input id={id} type="date" disabled={ro} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} />
            ) : f.type === "select" ? (
              <Select id={id} disabled={ro} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)}>
                {(f.options ?? []).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            ) : f.type === "team" ? (
              <>
                <TeamInput id={id} project={project} assets={assets} value={String(v ?? "")} disabled={ro} onChange={(x) => set(f.key, x)} />
                <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-[12px] text-mute">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-[#2A4BFF]" checked={!!data[`${f.key}__glow`]} disabled={ro} onChange={(e) => set(`${f.key}__glow`, e.target.checked ? "1" : "")} />
                  Záře kolem loga (1 px, bílá) – pro špatně čitelná loga
                </label>
              </>
            ) : f.type === "channel" ? (
              <Select id={id} disabled={ro} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)}>
                <option value="">—</option>
                {(project.brand.channels ?? []).map((c) => (
                  <option key={c.id}>{c.name}</option>
                ))}
              </Select>
            ) : f.type === "image" ? (
              <ImageField id={id} value={asImageValue(v)} disabled={ro} assets={assets} project={project} cutout={cutKeys.has(f.key)} onChange={(x) => set(f.key, x)} />
            ) : f.type === "list" ? (
              <ListField field={f} activeRow={template.paginate?.field === f.key ? activeRow : undefined} onActiveRow={template.paginate?.field === f.key ? onActiveRow : undefined} assets={assets} teams={project.teams} channels={project.brand.channels ?? []} rows={Array.isArray(v) ? (v as Record<string, unknown>[]) : []} disabled={ro} onChange={(rows) => set(f.key, rows)} />
            ) : (
              <Input id={id} disabled={ro} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TeamLogo({ team, assets, size = 40 }: { team?: Project["teams"][number]; assets: Record<string, string>; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line font-cond text-[11px] font-bold"
      style={{ width: size, height: size, background: team?.logo ? "#fff" : team?.color ?? "#EEF0F3", color: team && !team.logo ? "#fff" : "#5E6977" }}
    >
      {team?.logo && assets[team.logo] ? <img src={assets[team.logo]} alt="" className="h-full w-full object-contain p-0.5" /> : team?.short ?? "?"}
    </div>
  );
}

/** Výběr týmu: rozbalovací seznam všech týmů + možnost psát (filtruje) */
export function TeamInput({ id, value, onChange, project, assets, disabled }: { id: string; value: string; onChange: (v: string) => void; project: Project; assets: Record<string, string>; disabled?: boolean }) {
  const team = findTeam(project.teams, value);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
  const list = project.teams.filter((t) => !q || [t.name, t.short, ...t.aliases].some((n) => norm(n).includes(norm(q))));
  return (
    <div ref={box} className="relative flex items-center gap-2">
      <div title={team ? `Rozpoznáno: ${team.name}` : "Tým nenalezen – použije se monogram"}>
        <TeamLogo team={team} assets={assets} />
      </div>
      <div className="relative flex-1">
        <Input
          id={id}
          disabled={disabled}
          value={value}
          onFocus={() => setQ("")}
          onChange={(e) => {
            onChange(e.target.value);
            setQ(e.target.value);
            setOpen(true);
          }}
          placeholder="Vyberte nebo napište tým"
          className="pr-10"
          autoComplete="off"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setQ("");
            setOpen((o) => !o);
          }}
          className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded text-mute hover:bg-paper hover:text-ink"
          aria-label="Zobrazit všechny týmy"
        >
          <Icon name="chevronDown" size={18} />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-72 overflow-y-auto rounded-md border border-line bg-white py-1 shadow-pop">
            {list.length ? (
              list.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onChange(t.name);
                    setOpen(false);
                  }}
                  className={cx("flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-sm hover:bg-signal-soft", team?.id === t.id && "bg-paper font-semibold")}
                >
                  <TeamLogo team={t} assets={assets} size={28} />
                  <span className="truncate">{t.name}</span>
                  <span className="ml-auto text-[11px] text-mute">{t.short}</span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-[13px] text-mute">Žádný tým neodpovídá. Nový tým přidáte v Datové zdroje → Týmy.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Obrázek: nahrání, knihovna, ořez, odstranění pozadí ────────

export async function saveImageAsset(file: File | Blob, name: string, kind: Asset["kind"] = "photo"): Promise<Asset> {
  const pid = getState().settings.currentProjectId!;
  const f = file instanceof File ? file : new File([file], name, { type: file.type || "image/png" });
  const { dataUrl, w, h } = await importImageFile(f);
  const a: Asset = { id: uid("a-"), projectId: pid, name, kind, dataUrl, w, h, createdAt: Date.now() };
  await upsert("assets", a);
  return a;
}

function ImageField({ id, value, onChange, disabled, assets, project, cutout }: { id: string; value: ImageValue | null; onChange: (v: ImageValue | null) => void; disabled?: boolean; assets: Record<string, string>; project: Project; cutout?: boolean }) {
  const [lib, setLib] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const settings = useApp((s) => s.settings);
  const url = value?.asset ? assets[value.asset] ?? (/^(data:|https?:)/.test(value.asset) ? value.asset : undefined) : undefined;

  const upload = async (files: File[]) => {
    try {
      setBusy("Nahrávám…");
      const a = await saveImageAsset(files[0], files[0].name);
      onChange({ asset: a.id, zoom: 1, fx: 0.5, fy: 0.3 });
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setBusy(null);
    }
  };

  const removeBg = async (mode: "replace" | "cut" = "replace") => {
    if (!url) return;
    const remover = settings.bgProvider === "removebg" ? removeBgRemover(settings.removeBgKey) : browserRemover;
    const why = remover.unavailableReason();
    if (why) {
      toast(why, "info");
      return;
    }
    try {
      setBusy("Připravuji…");
      const blob = await dataUrlToBlob(url);
      const out = await remover.remove(blob, (msg, r) => setBusy(r !== undefined ? `${msg} ${Math.round(r * 100)} %` : msg));
      const a = await saveImageAsset(out, mode === "cut" ? "Vyříznutý hráč" : "Bez pozadí", "photo");
      if (mode === "cut" && value) {
        onChange({ ...value, cut: a.id });
        toast("Hráč je teď před pásem");
      } else {
        onChange({ asset: a.id, zoom: 1, fx: 0.5, fy: 0.5 });
        toast("Pozadí odstraněno");
      }
    } catch (e) {
      toast("Odstranění pozadí selhalo: " + (e as Error).message, "bad");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div id={id} className="rounded-md border border-line bg-white p-2">
      <div className="flex gap-3">
        <div className="checker relative h-20 w-20 shrink-0 overflow-hidden rounded border border-line">
          {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-mute"><Icon name="image" /></div>}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <Spinner className="text-signal" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <FileButton size="sm" accept="image/*" onFile={upload} disabled={disabled}>
              Nahrát
            </FileButton>
            <Button size="sm" icon="grid" onClick={() => setLib(true)} disabled={disabled}>
              Knihovna
            </Button>
            {cutout ? (
              value?.cut ? (
                <Button size="sm" icon="scissors" variant="ghost" onClick={() => value && onChange({ ...value, cut: undefined })} disabled={disabled} title="Odebrat ořez hráče nad pásem">
                  Ořez nad pásem ✓ ✕
                </Button>
              ) : (
                <>
                  <FileButton
                    size="sm"
                    accept="image/png,image/webp"
                    disabled={disabled || !value}
                    onFile={async (f) => {
                      if (!value) return;
                      setBusy("Nahrávám ořez…");
                      try {
                        const a = await saveImageAsset(f[0], "Ořez – " + f[0].name, "photo");
                        onChange({ ...value, cut: a.id });
                        toast("Ořez je nad pásem");
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    Nahrát ořez
                  </FileButton>
                  <Button size="sm" icon="scissors" onClick={() => removeBg("cut")} disabled={disabled || !url || !!busy} title="Vyřízne hráče (AI) ze stejné fotky a dá ho nad pás">
                    Vyříznout AI
                  </Button>
                </>
              )
            ) : (
              <Button size="sm" icon="scissors" onClick={() => removeBg()} disabled={disabled || !url || !!busy} title="Odstranit pozadí (AI)">
                Pozadí
              </Button>
            )}
            {value && <IconButton icon="trash" label="Odebrat fotku" onClick={() => onChange(null)} disabled={disabled} />}
          </div>
          {busy ? (
            <p className="text-[12px] text-mute">{busy}</p>
          ) : value ? (
            <div className="flex items-center gap-2">
              <span className="w-10 text-[11px] font-semibold uppercase text-mute">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={value.zoom ?? 1}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, zoom: Number(e.target.value) })}
                className="h-1 flex-1 accent-[#2A4BFF]"
                aria-label="Přiblížení fotky"
              />
              <IconButton icon="refresh" label="Obnovit ořez" onClick={() => onChange({ ...value, zoom: 1, fx: 0.5, fy: 0.3 })} disabled={disabled} />
            </div>
          ) : (
            <p className="text-[12px] text-mute">Ořez upravíte tažením fotky v náhledu.</p>
          )}
        </div>
      </div>
      <AssetLibrary open={lib} onClose={() => setLib(false)} project={project} onPick={(a) => onChange({ asset: a, zoom: 1, fx: 0.5, fy: 0.3 })} />
    </div>
  );
}

export function AssetLibrary({ open, onClose, onPick, project, kinds }: { open: boolean; onClose: () => void; onPick: (assetId: string) => void; project: Project; kinds?: Asset["kind"][] }) {
  const all = useApp((s) => s.assets);
  const list = useMemo(
    () => all.filter((a) => (a.projectId === project.id || a.projectId === "shared") && a.kind !== "font" && (!kinds || kinds.includes(a.kind))).sort((a, b) => b.createdAt - a.createdAt),
    [all, project.id, kinds],
  );
  return (
    <Modal open={open} onClose={onClose} title="Knihovna obrázků" wide>
      {list.length ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {list.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                onPick(a.id);
                onClose();
              }}
              className="group overflow-hidden rounded-md border border-line text-left hover:border-signal focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
            >
              <div className="checker aspect-square">
                <img src={a.dataUrl} alt="" className="h-full w-full object-contain" />
              </div>
              <div className="truncate px-1.5 py-1 text-[11px] text-mute">{a.name}</div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-mute">Knihovna je prázdná. Nahrajte fotku tlačítkem „Nahrát“.</p>
      )}
    </Modal>
  );
}

// ── Seznam (řádky tabulky) ───────────────────────────────────

/** Tým v tabulce: logo + rozbalovací seznam všech týmů (mimo posuvnou tabulku) + záře kolem loga. */
function TeamCell({ value, onChange, glow, onGlow, teams, assets, disabled, label, boxed }: { value: string; onChange: (v: string) => void; glow: boolean; onGlow: (v: boolean) => void; teams: Project["teams"]; assets: Record<string, string>; disabled?: boolean; label: string; boxed?: boolean }) {
  const team = findTeam(teams, value);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<{ left: number; top: number; up: boolean } | null>(null);
  const anchor = React.useRef<HTMLDivElement>(null);
  const pop = React.useRef<HTMLDivElement>(null);
  const place = () => {
    const r = anchor.current?.getBoundingClientRect();
    if (!r) return;
    const up = r.bottom + 320 > window.innerHeight && r.top > 320;
    setPos({ left: Math.min(r.left, window.innerWidth - 272), top: up ? r.top - 4 : r.bottom + 4, up });
  };
  React.useEffect(() => {
    if (!open) return;
    place();
    const close = (e: MouseEvent) => !anchor.current?.contains(e.target as Node) && !pop.current?.contains(e.target as Node) && setOpen(false);
    const re = () => place();
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", re, true);
    window.addEventListener("resize", re);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", re, true);
      window.removeEventListener("resize", re);
    };
  }, [open]);
  const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
  const list = teams.filter((t) => !q || [t.name, t.short, ...t.aliases].some((n) => norm(n).includes(norm(q))));
  return (
    <div ref={anchor} className={cx("flex items-center gap-1", boxed ? "min-w-0 rounded border border-line bg-white pl-1" : "min-w-[150px]")}>
      <button type="button" disabled={disabled} onClick={() => { setQ(""); setOpen((o) => !o); }} className="relative shrink-0 rounded-full" title={team ? team.name : "Vybrat tým"} aria-label={`Vybrat tým – ${label}`}>
        <TeamLogo team={team} assets={assets} size={26} />
        {glow && <span className="absolute -right-1 -top-1 rounded-full bg-signal px-[3px] text-[9px] font-bold leading-[13px] text-white">✦</span>}
      </button>
      <input
        disabled={disabled}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQ("");
          setOpen(true);
        }}
        aria-label={label}
        autoComplete="off"
        className="h-8 w-full min-w-0 rounded border border-transparent bg-transparent px-1.5 text-[13px] hover:border-line focus:border-signal focus:bg-white focus:outline-none"
      />
      <button type="button" disabled={disabled} onClick={() => { setQ(""); setOpen((o) => !o); }} className="shrink-0 rounded p-0.5 text-mute hover:bg-paper hover:text-ink" aria-label="Zobrazit všechny týmy">
        <Icon name="chevronDown" size={15} />
      </button>
      {open && pos &&
        createPortal(
          <div
            ref={pop}
            style={{ position: "fixed", left: pos.left, top: pos.top, transform: pos.up ? "translateY(-100%)" : undefined, width: 264 }}
            className="z-[80] rounded-md border border-line bg-white shadow-pop"
          >
            <label className="flex cursor-pointer items-center gap-2 border-b border-line px-2.5 py-2 text-[12px]">
              <input type="checkbox" className="h-3.5 w-3.5 accent-[#2A4BFF]" checked={glow} onChange={(e) => onGlow(e.target.checked)} />
              Záře kolem loga (1 px, bílá)
            </label>
            <div className="max-h-64 overflow-y-auto py-1">
              {list.length ? (
                list.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onChange(t.name);
                      setOpen(false);
                    }}
                    className={cx("flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-sm hover:bg-signal-soft", team?.id === t.id && "bg-paper font-semibold")}
                  >
                    <TeamLogo team={t} assets={assets} size={24} />
                    <span className="truncate">{t.name}</span>
                    <span className="ml-auto text-[11px] text-mute">{t.short}</span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-[13px] text-mute">Žádný tým neodpovídá.</p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function ImageCell({ value, onChange, disabled, assets }: { value: unknown; onChange: (v: ImageValue | null) => void; disabled?: boolean; assets: Record<string, string> }) {
  const iv = asImageValue(value);
  const url = iv?.asset ? assets[iv.asset] ?? (/^(data:|https?:)/.test(iv.asset) ? iv.asset : undefined) : undefined;
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <label className={cx("relative flex h-8 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-line bg-paper text-mute", disabled && "pointer-events-none opacity-50")} title="Nahrát fotku">
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : busy ? <Spinner className="h-4 w-4" /> : <Icon name="image" size={15} />}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={disabled}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            try {
              const a = await saveImageAsset(f, f.name);
              onChange({ asset: a.id });
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {url && !disabled && (
        <button type="button" className="px-0.5 text-[13px] text-mute hover:text-bad" onClick={() => onChange(null)} aria-label="Odebrat fotku">
          ×
        </button>
      )}
    </div>
  );
}

function ListField({ field, rows, onChange, disabled, channels = [], assets = {}, teams = [], activeRow, onActiveRow }: { field: FieldDef; rows: Record<string, unknown>[]; onChange: (r: Record<string, unknown>[]) => void; disabled?: boolean; channels?: Channel[]; assets?: Record<string, string>; teams?: Project["teams"]; activeRow?: number; onActiveRow?: (i: number) => void }) {
  const cols = field.columns ?? [];
  // hodně sloupců (např. carousel zápasů) → přehlednější karty, jinak tabulka
  const [view, setView] = useState<"cards" | "table">(cols.length > 5 ? "cards" : "table");
  const wide = (c: (typeof cols)[number]) => c.type === "text" && !/^(time|detail|pct|credit)$/.test(c.key) ? true : c.type === "list";
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");
  const setCell = (i: number, k: string, v: unknown) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const move = (i: number, d: number) => {
    const n = [...rows];
    const [x] = n.splice(i, 1);
    n.splice(clamp(i + d, 0, n.length), 0, x);
    onChange(n);
  };
  const doPaste = () => {
    const t = text.trim();
    try {
      let out: Record<string, unknown>[] = [];
      if (t.startsWith("[") || t.startsWith("{")) out = toRows(JSON.parse(t));
      else if (/[;,\t]/.test(t.split("\n")[0]) && t.split("\n")[0].split(/[;,\t]/).length >= 2 && !/\d{1,3}\s*:\s*\d{1,3}/.test(t.split("\n")[0])) out = parseCsv(t).rows;
      else {
        out = parseResultLines(t);
        if (!out.length) out = parseScheduleLines(t);
      }
      if (!out.length) throw new Error("Nerozpoznal jsem žádné řádky.");
      onChange(keepImages(field, rows, out));
      setPaste(false);
      setText("");
      toast(`Načteno ${out.length} řádků`);
    } catch (e) {
      toast((e as Error).message, "bad");
    }
  };
  const cell = (c: NonNullable<FieldDef["columns"]>[number], r: Record<string, unknown>, i: number, boxed = false) => {
    const box = boxed ? "border-line bg-white" : "border-transparent bg-transparent";
    return (
      <>
                    {c.type === "team" ? (
                      <TeamCell
                        value={String(r[c.key] ?? "")}
                        onChange={(v) => setCell(i, c.key, v)}
                        glow={!!r[`${c.key}__glow`]}
                        onGlow={(v) => setCell(i, `${c.key}__glow`, v ? "1" : "")}
                        teams={teams}
                        assets={assets}
                        disabled={disabled}
                        label={`${c.label} ${i + 1}`}
                        boxed={boxed}
                      />
                    ) : c.type === "image" ? (
                      <ImageCell value={r[c.key]} disabled={disabled} assets={assets} onChange={(v) => setCell(i, c.key, v)} />
                    ) : c.type === "channel" ? (
                      <select
                        disabled={disabled}
                        value={String(r[c.key] ?? "")}
                        onChange={(e) => setCell(i, c.key, e.target.value)}
                        aria-label={`${c.label} ${i + 1}`}
                        title={channels.length ? undefined : "Přidejte TV stanice v Brand kitu"}
                        className={cx(`h-8 w-full min-w-[64px] rounded border ${box} px-1 text-[13px] hover:border-line focus:border-signal focus:bg-white focus:outline-none`, r[c.key] ? "font-semibold text-signal" : "text-mute")}
                      >
                        <option value="">—</option>
                        {channels.map((ch) => (
                          <option key={ch.id}>{ch.name}</option>
                        ))}
                        {!!r[c.key] && !channels.some((ch) => ch.name === r[c.key]) && <option>{String(r[c.key])}</option>}
                      </select>
                    ) : (
                    <input
                      disabled={disabled}
                      value={String(r[c.key] ?? "")}
                      onChange={(e) => setCell(i, c.key, e.target.value)}
                      aria-label={`${c.label} ${i + 1}`}
                      className={cx(`h-8 w-full min-w-[48px] rounded border ${box} px-1.5 text-[13px] hover:border-line focus:border-signal focus:bg-white focus:outline-none`, c.type === "number" && "tabular-nums")}
                    />
                    )}
                  </>
    );
  };
  return (
    <div className="rounded-md border border-line bg-white">
      <div className="flex items-center justify-end gap-1 border-b border-line px-1.5 py-1">
        <Segmented
          size="sm"
          value={view}
          onChange={(v) => setView(v)}
          options={[
            { value: "cards", label: "Karty" },
            { value: "table", label: "Tabulka" },
          ]}
        />
      </div>
      <div className={cx("overflow-auto", view === "cards" ? "max-h-[70vh]" : "max-h-[340px]")}>
        {view === "cards" ? (
          <div className="space-y-2 p-2">
            {rows.map((r, i) => (
              <div
                key={i}
                onFocusCapture={() => onActiveRow?.(i)}
                onClick={() => onActiveRow?.(i)}
                className={cx("rounded-md border p-2", activeRow === i ? "border-signal bg-signal-soft/40" : "border-line bg-paper/60")}
              >
                <div className="mb-1.5 flex items-center gap-1">
                  <span className="font-cond text-[12px] font-bold uppercase tracking-wide text-mute">
                    {i + 1}. {field.label.replace(/\s*\(.*\)$/, "").replace(/y$/, "")}
                    {activeRow === i && <span className="ml-1.5 text-signal">· v náhledu</span>}
                  </span>
                  <span className="flex-1" />
                  <IconButton icon="up" label="Nahoru" onClick={() => move(i, -1)} disabled={disabled || i === 0} className="h-7 w-7" />
                  <IconButton icon="trash" label="Smazat" onClick={() => onChange(rows.filter((_, j) => j !== i))} disabled={disabled} className="h-7 w-7" />
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  {cols.map((c) => (
                    <div key={c.key} className={cx("min-w-0", wide(c) && "col-span-2")}>
                      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-mute">{c.label}</div>
                      {cell(c, r, i, true)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-paper">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className="px-1.5 py-1.5 text-left font-cond text-[11px] font-bold uppercase tracking-wide text-mute">
                  {c.label}
                </th>
              ))}
              <th className="w-[76px]" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line">
                {cols.map((c) => (
                  <td key={c.key} className="p-1">
                    {cell(c, r, i)}
                  </td>
                ))}
                <td className="whitespace-nowrap pr-1 text-right">
                  <IconButton icon="up" label="Nahoru" onClick={() => move(i, -1)} disabled={disabled || i === 0} className="h-7 w-6" />
                  <IconButton icon="trash" label="Smazat řádek" onClick={() => onChange(rows.filter((_, j) => j !== i))} disabled={disabled} className="h-7 w-6" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 border-t border-line p-1.5">
        <Button size="sm" icon="plus" disabled={disabled} onClick={() => onChange([...rows, Object.fromEntries(cols.map((c) => [c.key, ""]))])}>
          Řádek
        </Button>
        <Button size="sm" icon="copy" disabled={disabled} onClick={() => setPaste(true)}>
          Vložit hromadně
        </Button>
        <span className="ml-auto self-center pr-1 text-[12px] text-mute tabular-nums">{rows.length} řádků</span>
      </div>
      <Modal
        open={paste}
        onClose={() => setPaste(false)}
        title={`Vložit: ${field.label}`}
        footer={
          <>
            <Button onClick={() => setPaste(false)}>Zrušit</Button>
            <Button variant="primary" onClick={doPaste}>
              Načíst
            </Button>
          </>
        }
      >
        <p className="mb-2 text-sm text-mute">Vložte CSV s hlavičkou, JSON pole, nebo jeden zápas na řádek:</p>
        <pre className="mb-3 rounded bg-paper p-2 text-[12px] text-ink">{"Nymburk – Brno 92:78 (24:18, 22:20, 25:21, 21:19)\nUSK Praha – Sluneta 26.9. 17:30"}</pre>
        <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={cols.map((c) => c.key).join(",")} className="font-mono text-[13px]" />
      </Modal>
    </div>
  );
}

export { fileToDataUrl };

/** Při nahrazení řádků (vložení textu, screenshot) zachová nahrané fotky ve stejném pořadí. */
export function keepImages(field: FieldDef, oldRows: Record<string, unknown>[], newRows: Record<string, unknown>[]) {
  const imgCols = (field.columns ?? []).filter((c) => c.type === "image").map((c) => c.key);
  if (!imgCols.length) return newRows;
  return newRows.map((r, i) => {
    const o = oldRows[i];
    if (!o) return r;
    const keep: Record<string, unknown> = {};
    for (const k of imgCols) if (o[k] && !r[k]) keep[k] = o[k];
    return { ...r, ...keep };
  });
}
