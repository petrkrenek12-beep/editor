"use client";
import React, { useState } from "react";
import { saveImageAsset } from "@/components/DataForm";
import { Badge, Button, Card, cx, Empty, FileButton, IconButton, Input, Label, Modal, PageHeader, Segmented, Select, Textarea, toast, useConfirm } from "@/components/ui";
import { parseCsv, parseJson, parseResultLines, parseScheduleLines, toRows } from "@/lib/data-import";
import { demoProvider, loadFromUrl, restProvider, SPORTS_RESOURCES, type SportsResource } from "@/lib/data-sources";
import { can } from "@/lib/permissions";
import { HAS_SERVER } from "@/lib/runtime";
import { remove, uid, upsert, useApp, useAssetMap, useCurrentProject, useCurrentUser } from "@/lib/store";
import type { Dataset, DataSourceKind, Team } from "@/lib/types";

const KIND_LABEL: Record<DataSourceKind, string> = { manual: "Ručně", json: "JSON", csv: "CSV", url: "URL", api: "API" };

export function DataSourcesPage() {
  const [tab, setTab] = useState<"sets" | "teams" | "api">("sets");
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title="Datové zdroje" sub="Data jsou oddělená od šablon. Jednu datovou sadu použijete v libovolné šabloně nebo pro hromadné generování." />
      <div className="mb-5">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "sets", label: "Datové sady" },
            { value: "teams", label: "Týmy a loga" },
            { value: "api", label: "Sportovní API" },
          ]}
        />
      </div>
      {tab === "sets" && <Datasets />}
      {tab === "teams" && <Teams />}
      {tab === "api" && <ApiInfo />}
    </div>
  );
}

// ── Datové sady ──────────────────────────────────────────────

function Datasets() {
  const project = useCurrentProject()!;
  const user = useCurrentUser();
  const datasets = useApp((s) => s.datasets.filter((d) => d.projectId === project.id));
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Dataset | null>(null);
  const { confirm, node } = useConfirm();
  const manage = can(user.role, "datasource.manage");

  const refresh = async (d: Dataset) => {
    try {
      let rows: Record<string, unknown>[] = [];
      if (d.kind === "url" && d.source) rows = await loadFromUrl(d.source);
      else if (d.kind === "api" && d.source) {
        const [base, res] = d.source.split("#");
        rows = base === "demo" ? await demoProvider.get(res as SportsResource) : await restProvider(base).get(res as SportsResource);
      }
      await upsert("datasets", { ...d, rows: rows as Dataset["rows"], updatedAt: Date.now() });
      toast(`Aktualizováno: ${rows.length} řádků`);
    } catch (e) {
      toast("Obnovení selhalo: " + (e as Error).message, "bad");
    }
  };

  return (
    <div>
      {node}
      {manage && (
        <div className="mb-4">
          <Button variant="primary" icon="plus" onClick={() => setOpen(true)}>
            Nová datová sada
          </Button>
        </div>
      )}
      {datasets.length ? (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="bg-paper text-left">
              <tr>
                {["Název", "Zdroj", "Řádky", "Sloupce", "Aktualizováno", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-cond text-[12px] font-bold uppercase tracking-wide text-mute">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d.id} className="border-t border-line">
                  <td className="px-4 py-2.5 font-semibold">
                    <button type="button" className="hover:underline" onClick={() => setView(d)}>
                      {d.name}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={d.kind === "api" || d.kind === "url" ? "signal" : "neutral"}>{KIND_LABEL[d.kind]}</Badge>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{d.rows.length}</td>
                  <td className="max-w-[260px] truncate px-4 py-2.5 text-mute">{Object.keys(d.rows[0] ?? {}).join(", ")}</td>
                  <td className="px-4 py-2.5 text-mute tabular-nums">{new Date(d.updatedAt).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right">
                    <IconButton icon="eye" label="Zobrazit" onClick={() => setView(d)} />
                    {(d.kind === "url" || d.kind === "api") && manage && <IconButton icon="refresh" label="Načíst znovu" onClick={() => refresh(d)} />}
                    {manage && (
                      <IconButton
                        icon="trash"
                        label="Smazat"
                        onClick={async () => {
                          if (await confirm(`Smazat datovou sadu „${d.name}“?`)) await remove("datasets", d.id);
                        }}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Žádná data">Přidejte CSV, JSON, URL nebo napojte API.</Empty>
      )}
      <NewDataset open={open} onClose={() => setOpen(false)} projectId={project.id} />
      <Modal open={!!view} onClose={() => setView(null)} title={view?.name ?? ""} wide>
        {view && <DataTable rows={view.rows as Record<string, unknown>[]} />}
      </Modal>
    </div>
  );
}

export function DataTable({ rows, max = 200 }: { rows: Record<string, unknown>[]; max?: number }) {
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return (
    <div className="max-h-[60vh] overflow-auto rounded-md border border-line">
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-paper">
          <tr>
            {cols.map((c) => (
              <th key={c} className="whitespace-nowrap px-2.5 py-2 text-left font-cond text-[12px] font-bold uppercase text-mute">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, max).map((r, i) => (
            <tr key={i} className="border-t border-line">
              {cols.map((c) => (
                <td key={c} className="whitespace-nowrap px-2.5 py-1.5 tabular-nums">
                  {typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewDataset({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const [kind, setKind] = useState<DataSourceKind>("csv");
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [api, setApi] = useState("demo");
  const [res, setRes] = useState<SportsResource>("matches");
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = async () => {
    setBusy(true);
    try {
      let r: Record<string, unknown>[] = [];
      if (kind === "csv") r = parseCsv(text).rows;
      if (kind === "json") r = toRows(parseJson(text));
      if (kind === "manual") {
        r = parseResultLines(text);
        if (!r.length) r = parseScheduleLines(text);
        if (!r.length) throw new Error("Nerozpoznal jsem formát řádků. Použijte např. „Nymburk – Brno 92:78“.");
      }
      if (kind === "url") r = await loadFromUrl(url);
      if (kind === "api") r = api === "demo" ? await demoProvider.get(res) : await restProvider(api).get(res);
      setRows(r);
      if (!name) setName(kind === "api" ? SPORTS_RESOURCES.find((x) => x.id === res)!.label : kind === "url" ? url.split("/").pop() || "Data z URL" : "Nová data");
    } catch (e) {
      toast((e as Error).message, "bad");
      setRows(null);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!rows) return;
    const d: Dataset = {
      id: uid("d-"),
      projectId,
      name: name || "Data",
      kind,
      rows: rows as Dataset["rows"],
      source: kind === "url" ? url : kind === "api" ? `${api}#${res}` : undefined,
      updatedAt: Date.now(),
    };
    await upsert("datasets", d);
    toast("Datová sada uložena");
    setRows(null);
    setText("");
    setName("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nová datová sada"
      wide
      footer={
        <>
          <Button onClick={onClose}>Zrušit</Button>
          <Button onClick={preview} disabled={busy} icon="eye">
            {busy ? "Načítám…" : "Načíst náhled"}
          </Button>
          <Button variant="primary" onClick={save} disabled={!rows}>
            Uložit
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Segmented
            value={kind}
            onChange={(k) => {
              setKind(k);
              setRows(null);
            }}
            options={[
              { value: "csv", label: "CSV" },
              { value: "json", label: "JSON" },
              { value: "manual", label: "Text" },
              { value: "url", label: "URL" },
              { value: "api", label: "API" },
            ]}
          />
        </div>
        <div>
          <Label htmlFor="ds-name">Název</Label>
          <Input id="ds-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="např. Výsledky 4. kola" />
        </div>
        {(kind === "csv" || kind === "json" || kind === "manual") && (
          <div>
            <Label hint={kind === "csv" ? "první řádek = hlavička" : kind === "manual" ? "jeden zápas na řádek" : undefined}>Data</Label>
            <Textarea
              rows={9}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="font-mono text-[13px]"
              placeholder={kind === "csv" ? "player,number,position,height,age\nJan Novák,8,PG,188,24" : kind === "json" ? '[{"home":"Nymburk","away":"Brno","home_score":92,"away_score":78}]' : "Nymburk – Brno 92:78\nOpava – Děčín 81:76\nUSK Praha – Sluneta 26.9. 17:30"}
            />
            {kind === "csv" && (
              <div className="mt-2">
                <FileButton size="sm" accept=".csv,text/csv,.tsv,.txt" onFile={async (f) => setText(await f[0].text())}>
                  Nahrát soubor CSV
                </FileButton>
              </div>
            )}
          </div>
        )}
        {kind === "url" && (
          <div>
            <Label htmlFor="ds-url" hint="CSV nebo JSON">
              URL
            </Label>
            <Input id="ds-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…/export?format=csv" />
            <p className="mt-1 text-[12px] text-mute">
              Google Sheets: Soubor → Sdílet → Publikovat na web → CSV.{" "}
              {HAS_SERVER ? "Když server zdroje nepovolí CORS, načte se přes /api/proxy." : "V živé ukázce funguje jen pro zdroje s povoleným CORS."}
            </p>
          </div>
        )}
        {kind === "api" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Poskytovatel</Label>
              <Select value={api === "demo" ? "demo" : "rest"} onChange={(e) => setApi(e.target.value === "demo" ? "demo" : HAS_SERVER ? `${location.origin}/api/sports` : "https://")}>
                <option value="demo">Demo NBL (vestavěné)</option>
                <option value="rest">Vlastní REST API</option>
              </Select>
              {api !== "demo" && <Input className="mt-2" value={api} onChange={(e) => setApi(e.target.value)} placeholder="https://api.example.com/v1" aria-label="Základní URL API" />}
            </div>
            <div>
              <Label>Endpoint</Label>
              <Select value={res} onChange={(e) => setRes(e.target.value as SportsResource)}>
                {SPORTS_RESOURCES.map((r) => (
                  <option key={r.id} value={r.id}>
                    GET {r.endpoint} – {r.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
        {rows && (
          <div>
            <Label hint={`${rows.length} řádků`}>Náhled</Label>
            <DataTable rows={rows} max={20} />
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Týmy ────────────────────────────────────────────────────

function Teams() {
  const project = useCurrentProject()!;
  const user = useCurrentUser();
  const assets = useAssetMap(project.id);
  const manage = can(user.role, "datasource.manage");
  const [csv, setCsv] = useState(false);
  const [text, setText] = useState("");
  const setTeams = (teams: Team[]) => upsert("projects", { ...project, teams });
  const upd = (id: string, p: Partial<Team>) => setTeams(project.teams.map((t) => (t.id === id ? { ...t, ...p } : t)));

  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-mute">
        Když do pole „Tým“ napíšete název, zkratku nebo alias, šablona sama načte logo a barvy týmu. Bez nahraného loga se vykreslí monogram v barvách týmu.
      </p>
      {manage && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setTeams([...project.teams, { id: uid("tm-"), name: "Nový tým", short: "NEW", aliases: [], color: "#333333", color2: "#FFFFFF" }])}
          >
            Přidat tým
          </Button>
          <Button icon="upload" onClick={() => setCsv(true)}>
            Import z CSV
          </Button>
        </div>
      )}
      <div className="grid gap-2 md:grid-cols-2">
        {project.teams.map((t) => (
          <Card key={t.id} className="flex gap-3 p-3">
            <div className="flex w-20 shrink-0 flex-col items-center gap-1.5">
              <div className={cx("flex h-16 w-16 items-center justify-center overflow-hidden rounded-full", !t.logo && "border-[3px]")} style={{ background: t.logo ? "transparent" : t.color, borderColor: t.color2 }}>
                {t.logo && assets[t.logo] ? <img src={assets[t.logo]} alt="" className="h-full w-full object-contain" /> : <span className="font-cond text-lg font-bold" style={{ color: t.color2 }}>{t.short}</span>}
              </div>
              {manage && (
                <FileButton
                  size="sm"
                  variant="ghost"
                  accept="image/png,image/svg+xml,image/webp"
                  onFile={async (f) => {
                    const a = await saveImageAsset(f[0], `${t.name} logo`, "team");
                    upd(t.id, { logo: a.id });
                  }}
                >
                  Logo
                </FileButton>
              )}
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-[1fr_76px] gap-1.5">
              <Input value={t.name} disabled={!manage} onChange={(e) => upd(t.id, { name: e.target.value })} className="h-8 text-sm font-semibold" aria-label="Název" />
              <Input value={t.short} disabled={!manage} onChange={(e) => upd(t.id, { short: e.target.value })} className="h-8 text-sm uppercase" aria-label="Zkratka" />
              <Input value={t.aliases.join(", ")} disabled={!manage} onChange={(e) => upd(t.id, { aliases: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} className="col-span-2 h-8 text-[13px]" placeholder="Aliasy oddělené čárkou" aria-label="Aliasy" />
              <div className="col-span-2 flex items-center gap-2">
                <input type="color" value={t.color} disabled={!manage} onChange={(e) => upd(t.id, { color: e.target.value })} className="h-7 w-9 rounded border border-line" aria-label="Barva týmu" />
                <input type="color" value={t.color2} disabled={!manage} onChange={(e) => upd(t.id, { color2: e.target.value })} className="h-7 w-9 rounded border border-line" aria-label="Doplňková barva" />
                <span className="flex-1" />
                {t.logo && manage && <Button size="sm" variant="ghost" onClick={() => upd(t.id, { logo: undefined })}>Bez loga</Button>}
                {manage && <IconButton icon="trash" label="Smazat tým" onClick={() => setTeams(project.teams.filter((x) => x.id !== t.id))} />}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Modal
        open={csv}
        onClose={() => setCsv(false)}
        title="Import týmů"
        footer={
          <>
            <Button onClick={() => setCsv(false)}>Zrušit</Button>
            <Button
              variant="primary"
              onClick={() => {
                try {
                  const { rows } = parseCsv(text);
                  const add: Team[] = rows.map((r) => ({
                    id: uid("tm-"),
                    name: r.name ?? r.nazev ?? r["název"] ?? "",
                    short: (r.short ?? r.zkratka ?? (r.name ?? "").slice(0, 3)).toUpperCase(),
                    aliases: (r.aliases ?? r.aliasy ?? "").split(/[|;]/).map((x) => x.trim()).filter(Boolean),
                    color: r.color ?? r.barva ?? "#333333",
                    color2: r.color2 ?? "#FFFFFF",
                  })).filter((t) => t.name);
                  setTeams([...project.teams, ...add]);
                  toast(`Přidáno ${add.length} týmů`);
                  setCsv(false);
                } catch (e) {
                  toast((e as Error).message, "bad");
                }
              }}
            >
              Importovat
            </Button>
          </>
        }
      >
        <p className="mb-2 text-sm text-mute">Sloupce: name, short, aliases (oddělené |), color, color2</p>
        <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-[12px]" placeholder={"name,short,aliases,color,color2\nBK Nymburk,NYM,Nymburk|ERA,#C8102E,#FFFFFF"} />
      </Modal>
    </div>
  );
}

// ── API ─────────────────────────────────────────────────────

function ApiInfo() {
  const [out, setOut] = useState<Record<string, unknown>[] | null>(null);
  const [res, setRes] = useState<SportsResource>("matches");
  const [base, setBase] = useState(HAS_SERVER ? "/api/sports" : "demo");
  const test = async () => {
    try {
      setOut(base === "demo" ? await demoProvider.get(res) : await restProvider(base).get(res));
    } catch (e) {
      toast((e as Error).message, "bad");
    }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-2 font-cond text-lg font-bold uppercase">Architektura</h3>
        <pre className="mb-4 overflow-x-auto rounded-md bg-ink p-3 text-[12px] leading-relaxed text-white">{`DATA  →  TEMPLATE  →  RENDERER  →  EXPORT
(API, CSV,   (pole {{…}},   (canvas,       (PNG, JPG,
 JSON, URL)   rozložení)    auto-layout)    ZIP)`}</pre>
        <p className="mb-3 text-sm text-mute">
          Každý poskytovatel dat implementuje rozhraní <code className="rounded bg-paper px-1">SportsDataProvider</code> s metodou <code className="rounded bg-paper px-1">get(resource)</code>. Šablona o zdroji dat nic neví.
        </p>
        <ul className="space-y-1 text-sm">
          {SPORTS_RESOURCES.map((r) => (
            <li key={r.id} className="flex gap-2">
              <code className="w-36 shrink-0 rounded bg-paper px-1.5 py-0.5 text-[12px]">GET {r.endpoint}</code>
              <span className="text-mute">{r.label}</span>
            </li>
          ))}
        </ul>
        {HAS_SERVER && (
          <p className="mt-4 text-[13px] text-mute">
            Tato instance má ukázkové API na <code className="rounded bg-paper px-1">/api/sports/…</code>. Stačí nahradit data v <code className="rounded bg-paper px-1">app/api/sports/[resource]/route.ts</code> voláním skutečného zdroje (např. cz.basketball, FIBA LiveStats).
          </p>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="mb-3 font-cond text-lg font-bold uppercase">Otestovat</h3>
        <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
          <Input value={base} onChange={(e) => setBase(e.target.value)} aria-label="Základní URL" placeholder="demo nebo https://…" />
          <Select value={res} onChange={(e) => setRes(e.target.value as SportsResource)}>
            {SPORTS_RESOURCES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.endpoint}
              </option>
            ))}
          </Select>
        </div>
        <Button className="mt-3" icon="link" onClick={test}>
          Zavolat
        </Button>
        {out && (
          <div className="mt-4">
            <DataTable rows={out} max={15} />
          </div>
        )}
      </Card>
    </div>
  );
}
