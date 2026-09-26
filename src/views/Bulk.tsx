"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Thumb } from "@/components/GraphicCanvas";
import { saveImageAsset } from "@/components/DataForm";
import { Badge, Button, Card, cx, FileButton, Label, PageHeader, Segmented, Select, Textarea, toast } from "@/components/ui";
import { applyMapping, autoMap, mappingOptions, parseCsv, type Mapping } from "@/lib/data-import";
import { downloadBlob, renderPages, slug, zipFiles, type ImageType } from "@/lib/export";
import { FORMATS, FORMAT_ORDER } from "@/lib/formats";
import { can } from "@/lib/permissions";
import { pageCount, type RenderEnv } from "@/lib/render";
import { getState, useApp, useAssetMap, useCurrentProject, useCurrentUser } from "@/lib/store";
import { interpolate, normalize } from "@/lib/template-string";
import { ROSTER_CSV } from "@/lib/demo/data";
import type { DataRecord, FormatId } from "@/lib/types";

export function BulkPage() {
  const project = useCurrentProject()!;
  const user = useCurrentUser();
  const templates = useApp((s) => s.templates.filter((t) => t.projectId === project.id));
  const datasets = useApp((s) => s.datasets.filter((d) => d.projectId === project.id));
  const assets = useAssetMap(project.id);

  const [tplId, setTplId] = useState(() => templates.find((t) => t.id.endsWith("-welcome"))?.id ?? templates[0]?.id);
  const t = templates.find((x) => x.id === tplId);
  const listFields = t?.fields.filter((f) => f.type === "list") ?? [];
  const [mode, setMode] = useState<"rows" | "list">("rows");
  const [csv, setCsv] = useState(ROSTER_CSV);
  const [mapping, setMapping] = useState<Mapping>({});
  const [photos, setPhotos] = useState<{ id: string; name: string }[]>([]);
  const [photoField, setPhotoField] = useState<string>("");
  const [formats, setFormats] = useState<FormatId[]>(["ig_portrait"]);
  const [type, setType] = useState<ImageType>("png");
  const [nameTpl, setNameTpl] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const parsed = useMemo(() => {
    try {
      return parseCsv(csv);
    } catch {
      return { columns: [], rows: [] };
    }
  }, [csv]);

  useEffect(() => {
    if (!t) return;
    setMapping(autoMap(t.fields, parsed.columns));
    setPhotoField(t.fields.find((f) => f.type === "image")?.key ?? "");
    const nameCol = parsed.columns[0];
    setNameTpl(nameCol ? `{{${nameCol}}}` : t.name);
    if (!listFields.length) setMode("rows");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tplId, parsed.columns.join("|")]);

  if (!can(user.role, "graphic.export")) {
    return <div className="p-8 text-mute">Hromadné generování je dostupné pro administrátora a editora.</div>;
  }
  if (!t) return <div className="p-8 text-mute">Projekt nemá žádné šablony.</div>;

  // přiřazení fotek k řádkům: podle názvu souboru, jinak podle pořadí
  const photoFor = (row: Record<string, string>, i: number) => {
    if (!photos.length) return undefined;
    const vals = Object.values(row).map(normalize).filter((v) => v.length > 2);
    const byName = photos.find((p) => vals.some((v) => normalize(p.name).includes(v)));
    return (byName ?? photos[i])?.id;
  };

  const records: DataRecord[] =
    mode === "rows"
      ? parsed.rows.map((r, i) => {
          const d = applyMapping(t, r, mapping);
          const ph = photoField ? photoFor(r, i) : undefined;
          if (ph && photoField) d[photoField] = { asset: ph, zoom: 1, fx: 0.5, fy: 0.3 };
          return d;
        })
      : [{ ...t.sampleData, [listFields[0]?.key ?? "rows"]: parsed.rows as unknown as DataRecord[string] }];

  const envFor = (d: DataRecord, f: FormatId, page = 1): RenderEnv => ({ template: t, data: d, format: f, brand: project.brand, teams: project.teams, assets, page, pages: pageCount(t, d) });

  const total = records.reduce((a, d) => a + pageCount(t, d), 0) * formats.length;

  const generate = async () => {
    setProgress({ done: 0, total });
    try {
      const files: { name: string; blob: Blob }[] = [];
      let done = 0;
      for (let i = 0; i < records.length; i++) {
        const d = records[i];
        const base = mode === "rows" ? interpolate(nameTpl, { data: parsed.rows[i] as unknown as DataRecord, teams: project.teams }) || `${t.name}-${i + 1}` : t.name;
        for (const f of formats) {
          const out = await renderPages({ ...envFor(d, f), assets: { ...getAssetMap() } }, type, 1, `${String(i + 1).padStart(2, "0")}-${base}`);
          files.push(...out.map((o) => ({ ...o, name: formats.length > 1 ? `${FORMATS[f].short.replace(/[: ]/g, "x")}/${o.name}` : o.name })));
          done += out.length;
          setProgress({ done, total });
        }
      }
      const zip = await zipFiles(files);
      const r = await downloadBlob(zip, `${slug(t.name)}-hromadne-${files.length}.zip`);
      if (r === "saved") toast(`Hotovo: ${files.length} grafik v ZIPu`);
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title="Hromadné generování" sub="Nahrajte CSV – aplikace vytvoří jednu grafiku pro každý řádek, nebo celý seznam rozdělí na slidy carouselu." />
      <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card className="space-y-4 p-5">
            <Step n={1} title="Šablona" />
            <Select value={tplId} onChange={(e) => setTplId(e.target.value)} aria-label="Šablona">
              {templates.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </Select>
            {listFields.length > 0 && (
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { value: "rows", label: "Grafika na řádek" },
                  { value: "list", label: t.paginate ? "Carousel ze všech řádků" : "Všechny řádky do seznamu" },
                ]}
              />
            )}
          </Card>

          <Card className="space-y-3 p-5">
            <Step n={2} title="Data (CSV)" />
            <Textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} className="font-mono text-[12px]" spellCheck={false} aria-label="CSV" />
            <div className="flex flex-wrap gap-2">
              <FileButton size="sm" accept=".csv,text/csv,.tsv,.txt" onFile={async (f) => setCsv(await f[0].text())}>
                Nahrát CSV
              </FileButton>
              {datasets.length > 0 && (
                <select
                  className="h-8 rounded-md border border-line bg-white px-2 text-[13px]"
                  value=""
                  onChange={(e) => {
                    const d = datasets.find((x) => x.id === e.target.value);
                    if (!d) return;
                    const cols = Array.from(new Set(d.rows.flatMap((r) => Object.keys(r))));
                    const esc = (v: unknown) => {
                      const s = String(v ?? "");
                      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                    };
                    setCsv([cols.join(","), ...d.rows.map((r) => cols.map((c) => esc((r as Record<string, unknown>)[c])).join(","))].join("\n"));
                  }}
                  aria-label="Z datové sady"
                >
                  <option value="">Z datové sady…</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
              <Badge tone={parsed.rows.length ? "ok" : "warn"}>{parsed.rows.length} řádků</Badge>
            </div>
          </Card>

          {mode === "rows" && (
            <Card className="space-y-3 p-5">
              <Step n={3} title="Mapování sloupců" />
              <div className="space-y-2">
                {t.fields
                  .filter((f) => f.type !== "list" && f.type !== "image")
                  .map((f) => (
                    <div key={f.key} className="grid grid-cols-[1fr_1.2fr] items-center gap-2">
                      <span className="truncate text-sm">{f.label}</span>
                      <select
                        value={mapping[f.key] ?? ""}
                        onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                        className={cx("h-8 rounded-md border bg-white px-2 text-[13px]", mapping[f.key] ? "border-signal/40" : "border-line text-mute")}
                        aria-label={`Zdroj pro ${f.label}`}
                      >
                        {mappingOptions(parsed.columns).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
              </div>
              {photoField && (
                <div className="border-t border-line pt-3">
                  <Label hint="přiřadí se podle názvu souboru, jinak podle pořadí">Fotky</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <FileButton
                      size="sm"
                      accept="image/*"
                      multiple
                      onFile={async (files) => {
                        const out: { id: string; name: string }[] = [];
                        for (const f of files) out.push({ id: (await saveImageAsset(f, f.name)).id, name: f.name.replace(/\.\w+$/, "") });
                        setPhotos((p) => [...p, ...out]);
                      }}
                    >
                      Nahrát fotky
                    </FileButton>
                    {photos.length > 0 && (
                      <>
                        <Badge tone="ok">{photos.length} fotek</Badge>
                        <Button size="sm" variant="ghost" onClick={() => setPhotos([])}>
                          Vyčistit
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className="border-t border-line pt-3">
                <Label hint="{{sloupec}}">Názvy souborů</Label>
                <input value={nameTpl} onChange={(e) => setNameTpl(e.target.value)} className="h-9 w-full rounded-md border border-line px-2 font-mono text-[13px]" aria-label="Šablona názvu souboru" />
              </div>
            </Card>
          )}

          <Card className="space-y-3 p-5">
            <Step n={mode === "rows" ? 4 : 3} title="Formáty a export" />
            <div className="flex flex-wrap gap-1.5">
              {FORMAT_ORDER.filter((f) => t.formats.includes(f)).map((f) => {
                const on = formats.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormats(on ? formats.filter((x) => x !== f) : [...formats, f])}
                    className={cx("rounded-md border px-2.5 py-1.5 text-[12px] font-semibold", on ? "border-ink bg-ink text-white" : "border-line text-mute")}
                  >
                    {FORMATS[f].label} <span className="opacity-60 tabular-nums">{FORMATS[f].w}×{FORMATS[f].h}</span>
                  </button>
                );
              })}
            </div>
            <Segmented value={type} onChange={setType} options={[{ value: "png", label: "PNG" }, { value: "jpg", label: "JPG" }]} />
            <Button variant="primary" size="lg" icon="zip" className="w-full" disabled={!records.length || !formats.length || !!progress} onClick={generate}>
              {progress ? `Generuji ${progress.done}/${progress.total}…` : `Vygenerovat ${total} grafik (ZIP)`}
            </Button>
            {progress && (
              <div className="h-1.5 overflow-hidden rounded bg-paper">
                <div className="h-full bg-signal transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
              </div>
            )}
          </Card>
        </div>

        <div>
          <h3 className="mb-3 font-cond text-[13px] font-bold uppercase tracking-[0.1em] text-mute">
            Náhled {records.length > 12 ? "(prvních 12)" : ""}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {records.slice(0, 12).flatMap((d, i) => {
              const pages = pageCount(t, d);
              return Array.from({ length: Math.min(pages, mode === "list" ? 8 : 1) }, (_, p) => (
                <div key={`${i}-${p}`}>
                  <Thumb env={envFor(d, formats[0] ?? t.baseFormat, p + 1)} cacheKey={`bulk:${t.id}:${t.updatedAt}:${formats[0]}:${p}:${JSON.stringify(d).length}:${JSON.stringify(d).slice(0, 400)}`} className="rounded-md border border-line" />
                  <p className="mt-1 truncate text-[12px] text-mute">{mode === "list" ? `Slide ${p + 1}/${pages}` : `${i + 1}. ${Object.values(parsed.rows[i] ?? {})[0] ?? ""}`}</p>
                </div>
              ));
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function getAssetMap() {
  const m: Record<string, string> = {};
  const s = getState();
  for (const a of s.assets) m[a.id] = a.dataUrl;
  return m;
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink font-cond text-[13px] font-bold text-white">{n}</span>
      <span className="font-cond text-[16px] font-bold uppercase">{title}</span>
    </div>
  );
}
