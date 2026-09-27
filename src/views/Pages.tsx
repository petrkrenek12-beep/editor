"use client";
import React, { useMemo, useState } from "react";
import { Thumb } from "@/components/GraphicCanvas";
import { Badge, Button, cx, Empty, Icon, IconButton, Input, Modal, PageHeader, SectionTitle, toast, useConfirm, FileButton } from "@/components/ui";
import { importPsd, type PsdImportResult } from "@/lib/psd-import";
import { downloadBlob, fileName, renderPages, zipFiles } from "@/lib/export";
import { FORMATS } from "@/lib/formats";
import { applyOverrides } from "@/lib/graphic";
import { can } from "@/lib/permissions";
import type { RenderEnv } from "@/lib/render";
import { navigate } from "@/lib/router";
import { remove, uid, upsert, useApp, useAssetMap, useCurrentProject, useCurrentUser } from "@/lib/store";
import type { Graphic, Project, Template } from "@/lib/types";
import { blankTemplate } from "@/lib/demo/templates";

// ── Dashboard ────────────────────────────────────────────────

const ACTIONS = [
  { to: "/create", icon: "plus", title: "Vytvořit grafiku", text: "Vyberte šablonu a vyplňte data." },
  { to: "/templates", icon: "layers", title: "Moje šablony", text: "Správa a editor šablon." },
  { to: "/recent", icon: "clock", title: "Nedávné grafiky", text: "Otevřít, upravit, stáhnout znovu." },
  { to: "/data", icon: "database", title: "Datové zdroje", text: "CSV, JSON, URL, API a týmy." },
  { to: "/brand", icon: "palette", title: "Brand kit", text: "Loga, barvy, fonty, zámky." },
  { to: "/bulk", icon: "stack", title: "Hromadné generování", text: "Z CSV jedna grafika na řádek." },
];

export function Dashboard() {
  const project = useCurrentProject()!;
  const user = useCurrentUser();
  const graphics = useApp((s) => s.graphics.filter((g) => g.projectId === project.id));
  const templates = useApp((s) => s.templates.filter((t) => t.projectId === project.id));
  const assets = useAssetMap(project.id);
  const quick = templates.filter((t) => ["result", "program", "player-stats", "results-carousel"].some((k) => t.id.endsWith("-" + k))).slice(0, 4);
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title={
          <>
            <span className="text-mute">{project.parentName ? project.parentName + " / " : ""}</span>
            {project.name}
          </>
        }
        sub={`${templates.length} šablon · ${graphics.length} grafik · ${project.teams.length} týmů`}
        actions={
          can(user.role, "graphic.create") && (
            <Button variant="primary" size="lg" icon="plus" onClick={() => navigate("/create")}>
              Vytvořit grafiku
            </Button>
          )
        }
      />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        {ACTIONS.map((a) => (
          <button
            key={a.to}
            type="button"
            onClick={() => navigate(a.to)}
            className="group flex flex-col items-start gap-3 rounded-lg border border-line bg-white p-4 text-left transition-colors hover:border-ink"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-white group-hover:bg-signal">
              <Icon name={a.icon} size={18} />
            </span>
            <span>
              <span className="block font-cond text-[17px] font-bold uppercase leading-tight">{a.title}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-mute">{a.text}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-10">
        <SectionTitle action={graphics.length > 0 && <Button size="sm" variant="ghost" onClick={() => navigate("/recent")}>Vše</Button>}>Poslední grafiky</SectionTitle>
        {graphics.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {graphics.slice(0, 10).map((g) => (
              <GraphicCard key={g.id} g={g} />
            ))}
          </div>
        ) : (
          <Empty title="Zatím žádné grafiky" action={can(user.role, "graphic.create") && <Button variant="primary" icon="plus" onClick={() => navigate("/create")}>Vytvořit první</Button>}>
            Každá vytvořená a stažená grafika se tu objeví s náhledem, abyste ji mohli rychle upravit a stáhnout znovu.
          </Empty>
        )}
      </div>

      {quick.length > 0 && (
        <div className="mt-10">
          <SectionTitle>Rychlý start</SectionTitle>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {quick.map((t) => (
              <TemplateCard key={t.id} t={t} project={project} assets={assets} onClick={() => navigate(`/create/${t.id}`)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GraphicCard({ g }: { g: Graphic }) {
  return (
    <button type="button" onClick={() => navigate(`/create/${g.templateId}?g=${g.id}`)} className="group overflow-hidden rounded-lg border border-line bg-white text-left hover:border-ink">
      <div className="relative bg-ink/5" style={{ aspectRatio: `${FORMATS[g.format].w} / ${FORMATS[g.format].h}` }}>
        <img src={g.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <div className="px-2.5 py-2">
        <div className="truncate text-[13px] font-semibold">{g.name}</div>
        <div className="text-[11px] text-mute tabular-nums">
          {FORMATS[g.format].short} · {new Date(g.createdAt).toLocaleDateString("cs-CZ")}
        </div>
      </div>
    </button>
  );
}

export function TemplateCard({ t, project, assets, onClick, footer }: { t: Template; project: Project; assets: Record<string, string>; onClick: () => void; footer?: React.ReactNode }) {
  const env: RenderEnv = useMemo(() => ({ template: t, data: t.sampleData, format: t.baseFormat, brand: project.brand, teams: project.teams, assets, page: 1, pages: 2 }), [t, project, assets]);
  const key = `${t.id}:${t.updatedAt}:${JSON.stringify(project.brand).length}:${project.brand.colors.primary}${project.brand.colors.accent}${project.brand.fonts.display.family}${project.brand.logo}`;
  return (
    <div className="group overflow-hidden rounded-lg border border-line bg-white transition-colors hover:border-ink">
      <button type="button" onClick={onClick} className="block w-full text-left">
        <Thumb env={env} cacheKey={key} className="w-full" />
        <div className="px-3 pb-2 pt-2.5">
          <div className="flex items-center gap-2">
            <span className="truncate font-cond text-[16px] font-bold uppercase leading-tight">{t.name}</span>
          </div>
          <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-mute">{t.description}</div>
        </div>
      </button>
      {footer && <div className="flex items-center gap-1 border-t border-line px-2 py-1.5">{footer}</div>}
    </div>
  );
}

// ── Výběr šablony ────────────────────────────────────────────

export function TemplatePicker() {
  const project = useCurrentProject()!;
  const templates = useApp((s) => s.templates.filter((t) => t.projectId === project.id));
  const assets = useAssetMap(project.id);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Vše");
  const cats = ["Vše", ...Array.from(new Set(templates.map((t) => t.category)))];
  const list = templates.filter((t) => (cat === "Vše" || t.category === cat) && (!q || (t.name + " " + t.description).toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title="Vytvořit grafiku" sub="Vyberte šablonu. Pak jen vyplníte data – rozložení se postará samo." />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat šablonu…" className="max-w-xs" aria-label="Hledat" />
        <div className="flex flex-wrap gap-1">
          {cats.map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} className={cx("rounded-full border px-3 py-1.5 text-[13px] font-semibold", cat === c ? "border-ink bg-ink text-white" : "border-line bg-white text-mute hover:text-ink")}>
              {c}
            </button>
          ))}
        </div>
      </div>
      {list.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((t) => (
            <TemplateCard key={t.id} t={t} project={project} assets={assets} onClick={() => navigate(`/create/${t.id}`)} />
          ))}
        </div>
      ) : (
        <Empty title="Nic nenalezeno">Zkuste jiný výraz nebo kategorii.</Empty>
      )}
    </div>
  );
}

// ── Moje šablony ─────────────────────────────────────────────

export function TemplatesPage() {
  const project = useCurrentProject()!;
  const user = useCurrentUser();
  const templates = useApp((s) => s.templates.filter((t) => t.projectId === project.id));
  const assets = useAssetMap(project.id);
  const { confirm, node } = useConfirm();
  const admin = can(user.role, "template.edit");
  const [psdOpen, setPsdOpen] = useState(false);

  const create = async () => {
    const t = blankTemplate(project.id, uid("t-"));
    await upsert("templates", t);
    navigate(`/templates/${t.id}`);
  };
  const dup = async (t: Template) => {
    const c = { ...structuredClone(t), id: uid("t-"), name: t.name + " (kopie)", builtIn: false, createdAt: Date.now(), updatedAt: Date.now() };
    await upsert("templates", c);
    toast("Šablona zkopírována");
  };
  const exportJson = async (t: Template) => {
    await downloadBlob(new Blob([JSON.stringify(t, null, 2)], { type: "application/json" }), `sablona-${t.name}.json`);
  };
  const importJson = async (files: File[]) => {
    try {
      const t = JSON.parse(await files[0].text()) as Template;
      if (!t.elements || !t.fields) throw new Error("Soubor není šablona.");
      await upsert("templates", { ...t, id: uid("t-"), projectId: project.id, createdAt: Date.now(), updatedAt: Date.now(), builtIn: false });
      toast("Šablona importována");
    } catch (e) {
      toast((e as Error).message, "bad");
    }
  };
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-8 lg:py-8">
      {node}
      <PsdImport open={psdOpen} onClose={() => setPsdOpen(false)} projectId={project.id} />
      <PageHeader
        title="Moje šablony"
        sub="Šablony odkazují na brand kit projektu – změna barev nebo loga se projeví ve všech."
        actions={
          admin && (
            <>
              <FileButton accept="application/json,.json" onFile={importJson}>
                Import JSON
              </FileButton>
              <Button icon="layers" onClick={() => setPsdOpen(true)}>
                Import z Affinity / PSD
              </Button>
              <Button variant="primary" icon="plus" onClick={create}>
                Nová šablona
              </Button>
            </>
          )
        }
      />
      {!admin && <p className="mb-4 rounded-md border border-line bg-white px-3 py-2 text-sm text-mute">Šablony upravuje administrátor. Vy je můžete používat pro tvorbu grafik.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {templates.map((t) => (
          <TemplateCard
            key={t.id}
            t={t}
            project={project}
            assets={assets}
            onClick={() => navigate(admin ? `/templates/${t.id}` : `/create/${t.id}`)}
            footer={
              <>
                <Badge>{t.category}</Badge>
                <span className="flex-1" />
                <IconButton icon="plus" label="Vytvořit grafiku" onClick={() => navigate(`/create/${t.id}`)} />
                {admin && <IconButton icon="copy" label="Duplikovat" onClick={() => dup(t)} />}
                {admin && <IconButton icon="download" label="Export JSON" onClick={() => exportJson(t)} />}
                {admin && (
                  <IconButton
                    icon="trash"
                    label="Smazat"
                    onClick={async () => {
                      if (await confirm(`Smazat šablonu „${t.name}“?`)) {
                        await remove("templates", t.id);
                        toast("Šablona smazána");
                      }
                    }}
                  />
                )}
              </>
            }
          />
        ))}
      </div>
    </div>
  );
}

// ── Nedávné grafiky ──────────────────────────────────────────

export function RecentPage() {
  const project = useCurrentProject()!;
  const user = useCurrentUser();
  const graphics = useApp((s) => s.graphics.filter((g) => g.projectId === project.id));
  const templates = useApp((s) => s.templates);
  const assets = useAssetMap(project.id);
  const { confirm, node } = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (g: Graphic) => {
    const t = templates.find((x) => x.id === g.templateId);
    if (!t) return toast("Šablona této grafiky už neexistuje.", "bad");
    setBusy(g.id);
    try {
      const env: RenderEnv = { template: applyOverrides(t, g.overrides), data: g.data, format: g.format, brand: project.brand, teams: project.teams, assets };
      const files = await renderPages(env, "png", 1, g.name);
      if (files.length === 1) await downloadBlob(files[0].blob, files[0].name);
      else await downloadBlob(await zipFiles(files), fileName(g.name, g.format, "png").replace(".png", ".zip"));
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-8 lg:py-8">
      {node}
      <PageHeader title="Nedávné grafiky" sub="Grafiky se ukládají s daty – po otevření je můžete upravit a vyexportovat v jiném formátu." />
      {graphics.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {graphics.map((g) => (
            <div key={g.id} className="overflow-hidden rounded-lg border border-line bg-white">
              <button type="button" onClick={() => navigate(`/create/${g.templateId}?g=${g.id}`)} className="block w-full">
                <div className="relative bg-ink/5" style={{ aspectRatio: `${FORMATS[g.format].w} / ${FORMATS[g.format].h}` }}>
                  <img src={g.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              </button>
              <div className="px-2.5 py-2">
                <div className="truncate text-[13px] font-semibold">{g.name}</div>
                <div className="text-[11px] text-mute">
                  {g.templateName} · {new Date(g.createdAt).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {g.createdBy && ` · ${g.createdBy}`}
                </div>
              </div>
              <div className="flex border-t border-line px-1.5 py-1">
                <IconButton icon="pen" label="Upravit" onClick={() => navigate(`/create/${g.templateId}?g=${g.id}`)} />
                {can(user.role, "graphic.export") && <IconButton icon="download" label="Stáhnout PNG" disabled={busy === g.id} onClick={() => download(g)} />}
                <span className="flex-1" />
                {can(user.role, "graphic.delete") && (
                  <IconButton
                    icon="trash"
                    label="Smazat"
                    onClick={async () => {
                      if (await confirm("Smazat grafiku z historie?")) await remove("graphics", g.id);
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="Žádné grafiky">Grafika se sem uloží tlačítkem Uložit nebo při exportu.</Empty>
      )}
    </div>
  );
}

// ── Import PSD ───────────────────────────────────────────────

function PsdImport({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const [busy, setBusy] = useState(false);
  const [toFields, setToFields] = useState(true);
  const [res, setRes] = useState<PsdImportResult | null>(null);
  const run = async (files: File[]) => {
    setBusy(true);
    setRes(null);
    try {
      const f = files[0];
      if (/\.(af|afdesign|afphoto|afpub)$/i.test(f.name))
        throw new Error("soubory Affinity (.af) nejdou přečíst mimo Affinity – formát je uzavřený. V Affinity dejte Soubor → Exportovat → SVG (doporučeno) nebo PSD a nahrajte ten soubor.");
      const r = /\.svg$/i.test(f.name) || f.type === "image/svg+xml"
        ? await (await import("@/lib/svg-import")).importSvg(f, projectId, { textToFields: toFields })
        : await importPsd(f, projectId, { textToFields: toFields });
      for (const a of r.assets) await upsert("assets", a);
      await upsert("templates", r.template);
      setRes(r);
    } catch (e) {
      toast("Import se nepodařil: " + (e as Error).message, "bad");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import šablony z Affinity / Photoshopu"
      footer={
        res ? (
          <>
            <Button onClick={() => setRes(null)}>Importovat další</Button>
            <Button variant="primary" onClick={() => navigate(`/templates/${res.template.id}`)}>
              Otevřít v editoru
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Zavřít</Button>
        )
      }
    >
      {!res ? (
        <div className="space-y-4">
          <p className="text-sm text-mute">
            Nahrajte hotovou grafiku jako <b>SVG</b> nebo <b>PSD</b>. Každá vrstva se vloží na stejné místo, texty se stanou poli formuláře a fotka (vrstva „DSC…“, „foto…“) polem pro fotku.
          </p>
          <div className="rounded-md bg-paper p-3 text-[13px]">
            <p className="mb-1 font-semibold">Affinity (doporučeno SVG):</p>
            <ol className="list-decimal space-y-0.5 pl-5 text-mute">
              <li>Soubor → Exportovat → <b>SVG</b></li>
              <li>Předvolba „SVG (pro export)“, v Další: <b>Rastrovat: Nic</b>, <b>Převést text na křivky: vypnuto</b></li>
              <li>Exportovat a soubor .svg nahrát sem</li>
            </ol>
            <p className="mt-2 text-mute">SVG zachová přechody, masky i efekty. Soubor .afdesign přímo načíst nejde – formát Affinity je uzavřený.</p>
          </div>
          <p className="text-[13px] text-mute">Photoshop: Uložit jako → PSD. Efekty vrstev (fx) se z PSD nepřenáší – takové vrstvy rastrujte.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={toFields} onChange={(e) => setToFields(e.target.checked)} className="h-4 w-4 accent-[#2A4BFF]" />
            Texty převést na pole formuláře
          </label>
          <FileButton variant="primary" size="lg" accept=".svg,image/svg+xml,.psd,image/vnd.adobe.photoshop,.afdesign,.af" onFile={run} disabled={busy}>
            {busy ? "Načítám vrstvy…" : "Vybrat soubor SVG / PSD"}
          </FileButton>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="font-semibold">Šablona „{res.template.name}“ vytvořena.</p>
          <p className="text-mute tabular-nums">
            {res.report.layers} vrstev · {res.report.texts} textů · {res.report.images} obrázků · {res.report.fields} polí formuláře
          </p>
          {res.report.missingFonts.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[13px] text-warn">
              Chybějící fonty: <b>{res.report.missingFonts.join(", ")}</b>. Nahrajte je v Brand kitu („Nahrát vlastní font“, TTF/OTF) – texty je pak použijí automaticky.
            </div>
          )}
          {res.report.warnings.map((w) => (
            <p key={w} className="text-[13px] text-mute">• {w}</p>
          ))}
        </div>
      )}
    </Modal>
  );
}
