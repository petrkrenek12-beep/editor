"use client";
import React, { useMemo, useState } from "react";
import { GraphicCanvas } from "@/components/GraphicCanvas";
import { saveImageAsset } from "@/components/DataForm";
import { Badge, Button, Card, ColorInput, FileButton, IconButton, Label, PageHeader, SectionTitle, Select, Toggle, toast } from "@/components/ui";
import { FONT_LIBRARY, fontStack, parseFontName, registerCustomFont } from "@/lib/fonts";
import { fileToDataUrl } from "@/lib/images";
import { can } from "@/lib/permissions";
import { remove, uid, upsert, useApp, useAssetMap, useCurrentProject, useCurrentUser } from "@/lib/store";
import type { Asset, BrandKit as BK, FormatId } from "@/lib/types";

const COLOR_LABELS: [keyof BK["colors"], string, string][] = [
  ["primary", "Primární", "hlavní plochy"],
  ["secondary", "Sekundární", "pozadí, panely"],
  ["accent", "Akcent", "zvýraznění, štítky"],
  ["dark", "Tmavá", "přechody, stíny"],
  ["light", "Světlá", "světlé plochy"],
  ["text", "Text", "hlavní text"],
];

const LOCK_LABELS: [keyof BK["locks"], string][] = [
  ["logo", "Logo"],
  ["fonts", "Fonty"],
  ["colors", "Barvy"],
  ["photos", "Fotografie"],
  ["text", "Texty"],
];

export function BrandKitPage() {
  const project = useCurrentProject()!;
  const user = useCurrentUser();
  const admin = can(user.role, "brand.edit");
  const assets = useAssetMap(project.id);
  const allAssets = useApp((s) => s.assets);
  const templates = useApp((s) => s.templates.filter((t) => t.projectId === project.id));
  const brand = project.brand;
  const [previewFmt, setPreviewFmt] = useState<FormatId>("ig_portrait");

  const setBrand = (b: Partial<BK>) => upsert("projects", { ...project, brand: { ...brand, ...b } });

  const uploadLogo = async (key: "logo" | "logoAlt" | "partnerLogo", files: File[]) => {
    const a = await saveImageAsset(files[0], files[0].name, "logo");
    await setBrand({ [key]: a.id } as Partial<BK>);
    toast("Logo nahráno");
  };
  const uploadMany = async (key: "backgrounds" | "elements", files: File[]) => {
    const ids: string[] = [];
    for (const f of files) ids.push((await saveImageAsset(f, f.name, key === "backgrounds" ? "background" : "element")).id);
    await setBrand({ [key]: [...brand[key], ...ids] } as Partial<BK>);
  };
  const uploadFont = async (role: keyof BK["fonts"], files: File[]) => {
    const f = files[0];
    const family = parseFontName(f.name).family;
    const dataUrl = await fileToDataUrl(f);
    const a: Asset = { id: uid("f-"), projectId: project.id, name: f.name, kind: "font", dataUrl, createdAt: Date.now() };
    await upsert("assets", a);
    const pf = parseFontName(f.name);
    await registerCustomFont(family, dataUrl, { weight: pf.weight, italic: pf.italic });
    await setBrand({ fonts: { ...brand.fonts, [role]: { family, asset: a.id } } });
    toast(`Font „${family}“ nahrán`);
  };

  const customFonts = allAssets.filter((a) => a.projectId === project.id && a.kind === "font");
  const preview = templates.find((t) => t.id.endsWith("-result")) ?? templates[0];
  const preview2 = templates.find((t) => t.id.endsWith("-player-stats")) ?? templates[1];
  const envs = useMemo(
    () =>
      [preview, preview2]
        .filter(Boolean)
        .map((t) => ({ template: t!, data: t!.sampleData, format: previewFmt, brand, teams: project.teams, assets })),
    [preview, preview2, brand, project.teams, assets, previewFmt],
  );

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title="Brand kit" sub={`Vizuální identita projektu ${project.name}. Všechny šablony berou barvy, fonty a loga odsud.`} />
      {!admin && <p className="mb-5 rounded-md border border-line bg-white px-3 py-2 text-sm text-mute">Brand kit spravuje administrátor. Zobrazujete ho jen pro čtení.</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card className="p-5">
            <SectionTitle>Loga</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["logo", "Hlavní logo"],
                  ["logoAlt", "Alternativní logo"],
                  ["partnerLogo", "Liga / partner"],
                ] as const
              ).map(([k, label]) => {
                const id = brand[k];
                return (
                  <div key={k}>
                    <Label>{label}</Label>
                    <div className="checker-dark flex h-24 items-center justify-center rounded-md border border-line p-3">
                      {id && assets[id] ? <img src={assets[id]} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-[12px] text-white/60">nenahráno</span>}
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <FileButton size="sm" accept="image/png,image/svg+xml,image/webp" onFile={(f) => uploadLogo(k, f)} disabled={!admin}>
                        Nahrát
                      </FileButton>
                      {id && admin && <IconButton icon="trash" label="Odebrat" onClick={() => setBrand({ [k]: undefined } as Partial<BK>)} />}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[12px] text-mute">Nejlépe PNG nebo SVG s průhledným pozadím. Loga týmů nahrajete v Datových zdrojích → Týmy.</p>
          </Card>

          <Card className="p-5">
            <SectionTitle>Barvy</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {COLOR_LABELS.map(([k, label, hint]) => (
                <div key={k}>
                  <Label htmlFor={`c-${k}`} hint={hint}>
                    {label}
                  </Label>
                  <ColorInput id={`c-${k}`} value={brand.colors[k]} disabled={!admin} onChange={(v) => setBrand({ colors: { ...brand.colors, [k]: v } })} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle>Fonty</SectionTitle>
            <div className="space-y-5">
              {(
                [
                  ["display", "Nadpisový", "Čísla, skóre, titulky"],
                  ["body", "Textový", "Jména, popisky"],
                  ["accent", "Doplňkový", "Citace, kurzíva"],
                ] as const
              ).map(([k, label, hint]) => {
                const f = brand.fonts[k];
                return (
                  <div key={k} className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
                    <div>
                      <Label hint={hint}>{label}</Label>
                      <Select
                        value={f.asset ? `asset:${f.asset}` : f.family}
                        disabled={!admin}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v.startsWith("asset:")) {
                            const a = customFonts.find((x) => x.id === v.slice(6))!;
                            const family = parseFontName(a.name).family;
                            setBrand({ fonts: { ...brand.fonts, [k]: { family, asset: a.id } } });
                          } else setBrand({ fonts: { ...brand.fonts, [k]: { family: v } } });
                        }}
                      >
                        <optgroup label="Google Fonts (s češtinou)">
                          {FONT_LIBRARY.map((x) => (
                            <option key={x.family} value={x.family}>
                              {x.family}
                            </option>
                          ))}
                        </optgroup>
                        {customFonts.length > 0 && (
                          <optgroup label="Nahrané">
                            {customFonts.map((a) => (
                              <option key={a.id} value={`asset:${a.id}`}>
                                {a.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </Select>
                      <div className="mt-1.5">
                        <FileButton size="sm" accept=".ttf,.otf,.woff,.woff2,font/*" onFile={(fl) => uploadFont(k, fl)} disabled={!admin}>
                          Nahrát vlastní font
                        </FileButton>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-md bg-ink px-4 py-3 text-white">
                      <div className="truncate text-[34px] leading-none" style={{ fontFamily: fontStack(f.family), fontWeight: k === "display" ? 400 : 700 }}>
                        ZÁPASOVÝ DEN 92:78
                      </div>
                      <div className="mt-1 truncate text-[15px] opacity-80" style={{ fontFamily: fontStack(f.family) }}>
                        Příliš žluťoučký kůň úpěl ďábelské ódy
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[12px] text-mute">Tip: nahrajte stejný font, jaký používáte ve Photoshopu (TTF/OTF/WOFF) – grafiky budou vypadat identicky.</p>
          </Card>

          <Card className="p-5">
            <SectionTitle>Pozadí a grafické prvky</SectionTitle>
            {(["backgrounds", "elements"] as const).map((k) => (
              <div key={k} className="mb-4 last:mb-0">
                <Label hint={k === "backgrounds" ? "v šabloně jako brand:bg0, bg1…" : "brand:el0, el1…"}>{k === "backgrounds" ? "Pozadí" : "Grafické prvky"}</Label>
                <div className="flex flex-wrap gap-2">
                  {brand[k].map((id, i) => (
                    <div key={id} className="checker group relative h-20 w-20 overflow-hidden rounded border border-line">
                      {assets[id] && <img src={assets[id]} alt="" className="h-full w-full object-cover" />}
                      <span className="absolute left-1 top-1 rounded bg-ink/80 px-1 text-[10px] font-bold text-white">{i}</span>
                      {admin && (
                        <button
                          type="button"
                          className="absolute right-1 top-1 hidden rounded bg-white px-1 text-[11px] font-bold text-bad group-hover:block"
                          onClick={async () => {
                            await setBrand({ [k]: brand[k].filter((x) => x !== id) } as Partial<BK>);
                            await remove("assets", id);
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <FileButton accept="image/*" multiple onFile={(f) => uploadMany(k, f)} disabled={!admin}>
                    Přidat
                  </FileButton>
                </div>
              </div>
            ))}
          </Card>

          <Card className="p-5">
            <SectionTitle>Co mohou měnit editoři</SectionTitle>
            <p className="mb-3 text-sm text-mute">Zamčené položky může měnit jen administrátor. Chrání to vizuální identitu – editor nemůže vytvořit grafiku mimo brand.</p>
            <div className="divide-y divide-line">
              {LOCK_LABELS.map(([k, label]) => (
                <Toggle
                  key={k}
                  checked={brand.locks[k]}
                  disabled={!admin}
                  onChange={(v) => setBrand({ locks: { ...brand.locks, [k]: v } })}
                  label={
                    <span className="flex items-center gap-2">
                      {label} <Badge tone={brand.locks[k] ? "dark" : "ok"}>{brand.locks[k] ? "uzamčeno" : "editovatelné"}</Badge>
                    </span>
                  }
                />
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <SectionTitle>Živý náhled</SectionTitle>
              <select value={previewFmt} onChange={(e) => setPreviewFmt(e.target.value as FormatId)} className="h-8 rounded border border-line px-1 text-[12px]" aria-label="Formát náhledu">
                <option value="ig_portrait">4:5</option>
                <option value="ig_square">1:1</option>
                <option value="ig_story">9:16</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {envs.map((e, i) => (
                <GraphicCanvas key={i} env={e} maxHeight={320} />
              ))}
            </div>
          </Card>
          {admin && (
            <Button className="mt-3 w-full" variant="ghost" icon="refresh" onClick={() => setBrand({ colors: { primary: "#5B21B6", secondary: "#2A0B5E", accent: "#FF6A13", dark: "#0B0614", light: "#FFFFFF", text: "#FFFFFF" } })}>
              Obnovit výchozí barvy
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
