"use client";
import React, { useMemo, useState } from "react";
import { browserRemover, removeBgRemover } from "@/lib/bg-removal";
import { parseCsv, parseResultLines, parseScheduleLines, toRows } from "@/lib/data-import";
import { asImageValue, clamp } from "@/lib/graphic";
import { dataUrlToBlob, fileToDataUrl, importImageFile } from "@/lib/images";
import { getState, uid, upsert, useApp } from "@/lib/store";
import { findTeam } from "@/lib/template-string";
import type { Asset, Channel, DataRecord, FieldDef, ImageValue, Project, Template } from "@/lib/types";
import { Button, cx, FileButton, Icon, IconButton, Input, Label, Modal, Select, Spinner, Textarea, toast } from "./ui";

export function DataForm({
  template,
  data,
  onChange,
  project,
  assets,
  readOnlyField,
  compact,
}: {
  template: Template;
  data: DataRecord;
  onChange: (d: DataRecord) => void;
  project: Project;
  assets: Record<string, string>;
  readOnlyField?: (f: FieldDef) => boolean;
  compact?: boolean;
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
              <ListField field={f} channels={project.brand.channels ?? []} rows={Array.isArray(v) ? (v as Record<string, unknown>[]) : []} disabled={ro} onChange={(rows) => set(f.key, rows)} />
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
                <Button size="sm" icon="scissors" variant="ghost" onClick={() => value && onChange({ ...value, cut: undefined })} disabled={disabled} title="Zrušit vyříznutého hráče v popředí">
                  Hráč před pásem ✓
                </Button>
              ) : (
                <Button size="sm" icon="scissors" onClick={() => removeBg("cut")} disabled={disabled || !url || !!busy} title="Vyřízne hráče (AI) a dá ho před pás – fotka zůstane celá">
                  Hráč před pás
                </Button>
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

function ListField({ field, rows, onChange, disabled, channels = [] }: { field: FieldDef; rows: Record<string, unknown>[]; onChange: (r: Record<string, unknown>[]) => void; disabled?: boolean; channels?: Channel[] }) {
  const cols = field.columns ?? [];
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");
  const setCell = (i: number, k: string, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
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
      onChange(out);
      setPaste(false);
      setText("");
      toast(`Načteno ${out.length} řádků`);
    } catch (e) {
      toast((e as Error).message, "bad");
    }
  };
  return (
    <div className="rounded-md border border-line bg-white">
      <div className="max-h-[340px] overflow-auto">
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
                    {c.type === "channel" ? (
                      <select
                        disabled={disabled}
                        value={String(r[c.key] ?? "")}
                        onChange={(e) => setCell(i, c.key, e.target.value)}
                        aria-label={`${c.label} ${i + 1}`}
                        title={channels.length ? undefined : "Přidejte TV stanice v Brand kitu"}
                        className={cx("h-8 w-full min-w-[64px] rounded border border-transparent bg-transparent px-1 text-[13px] hover:border-line focus:border-signal focus:bg-white focus:outline-none", r[c.key] ? "font-semibold text-signal" : "text-mute")}
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
                      list={c.type === "team" ? "team-list" : undefined}
                      value={String(r[c.key] ?? "")}
                      onChange={(e) => setCell(i, c.key, e.target.value)}
                      aria-label={`${c.label} ${i + 1}`}
                      className={cx("h-8 w-full min-w-[48px] rounded border border-transparent bg-transparent px-1.5 text-[13px] hover:border-line focus:border-signal focus:bg-white focus:outline-none", c.type === "number" && "tabular-nums")}
                    />
                    )}
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
