"use client";
import React, { useEffect, useRef, useState } from "react";
import { adjustPresets, mixColor, type PhotoAdjust } from "@/lib/adjust";
import type { BrandKit } from "@/lib/types";
import { Button, cx, Segmented, toast } from "./ui";

type NumKey = "exposure" | "contrast" | "shadows" | "highlights" | "whites" | "blacks" | "saturation" | "vibrance" | "temperature" | "tint" | "clarity" | "sharpen" | "fade" | "glow" | "vignette" | "mono";
type Slider = { k: NumKey; label: string; min?: number; bar?: string };
const TONE: Slider[] = [
  { k: "exposure", label: "Expozice" },
  { k: "contrast", label: "Kontrast" },
  { k: "highlights", label: "Světla" },
  { k: "shadows", label: "Stíny" },
  { k: "whites", label: "Bílé" },
  { k: "blacks", label: "Černé" },
];
const COLOR: Slider[] = [
  { k: "vibrance", label: "Živost (vibrance)", bar: "linear-gradient(90deg,#888,#2ab0e8)" },
  { k: "saturation", label: "Sytost", bar: "linear-gradient(90deg,#888,#e33)" },
  { k: "temperature", label: "Teplota", bar: "linear-gradient(90deg,#2a5cff,#eee,#ffd400)" },
  { k: "tint", label: "Odstín", bar: "linear-gradient(90deg,#1db954,#eee,#d03fd0)" },
];
const DETAIL: Slider[] = [
  { k: "clarity", label: "Clarity (detail)", min: 0 },
  { k: "sharpen", label: "Doostření", min: 0 },
];
const FX: Slider[] = [
  { k: "glow", label: "Záře světel", min: 0 },
  { k: "fade", label: "Matnost (film)", min: 0 },
  { k: "vignette", label: "Viněta", min: 0 },
  { k: "mono", label: "Černobílé", min: 0, bar: "linear-gradient(90deg,#d33,#888)" },
];

// schránka úprav – sdílená mezi fotkami (i po obnovení stránky)
const CLIP_KEY = "presetka-adjust-clipboard";
let clip: PhotoAdjust | null = null;
const readClip = (): PhotoAdjust | null => {
  if (clip) return clip;
  try {
    const v = localStorage.getItem(CLIP_KEY);
    return v ? (JSON.parse(v) as PhotoAdjust) : null;
  } catch {
    return null;
  }
};

// Pomocné komponenty jsou mimo AdjustPanel, aby se při tažení posuvníku nepřemontovávaly.
function Color({ v, on, swatches }: { v: string; on: (c: string) => void; swatches: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {swatches.map((c) => (
        <button key={c} type="button" onClick={() => on(c)} className={cx("h-5 w-5 rounded-full border", v.toLowerCase() === c.toLowerCase() ? "border-ink ring-2 ring-signal" : "border-line")} style={{ background: c }} aria-label={c} />
      ))}
      <input type="color" value={v} onChange={(e) => on(e.target.value)} className="h-5 w-6 rounded border border-line" aria-label="Vlastní barva" />
    </div>
  );
}
function Range({ label, v, on, min = -100, max = 100, bar }: { label: string; v: number; on: (n: number) => void; min?: number; max?: number; bar?: string }) {
  return (
    <label className="block">
      <div className="flex justify-between text-[11px]">
        <span className="font-semibold">{label}</span>
        <button type="button" className="tabular-nums text-mute" onClick={() => on(0)} title="Vynulovat">
          {v > 0 && min < 0 ? "+" : ""}
          {v}
        </button>
      </div>
      <input type="range" min={min} max={max} value={v} onChange={(e) => on(Number(e.target.value))} className="h-1.5 w-full accent-[#2A4BFF]" style={bar ? { background: bar, borderRadius: 4 } : undefined} />
    </label>
  );
}
function Sliders({ list, a, set }: { list: Slider[]; a: PhotoAdjust; set: (k: NumKey, n: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
      {list.map((s) => (
        <Range key={s.k} label={s.label} v={a[s.k] ?? 0} min={s.min} bar={s.bar} on={(n) => set(s.k, n)} />
      ))}
    </div>
  );
}
function Section({ title, active, open, children }: { title: string; active: boolean; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="group border-t border-line pt-2" open={open || active || undefined}>
      <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-bold uppercase tracking-wide text-mute">
        <span>
          {title}
          {active && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-signal align-middle" />}
        </span>
        <span className="transition group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-2 space-y-2">{children}</div>
    </details>
  );
}

/** Úpravy fotky jako Camera Raw / Lightroom: tón, barvy, detail, tónování, efekty + nasvícení do barev grafiky. */
export function AdjustPanel({ value, onChange, brand, cutout }: { value: PhotoAdjust | undefined; onChange: (a: PhotoAdjust | undefined) => void; brand: BrandKit; cutout?: boolean }) {
  const [a, setA] = useState<PhotoAdjust>(value ?? {});
  const [comparing, setComparing] = useState(false);
  const [hasClip, setHasClip] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!comparing) setA(value ?? {});
  }, [value, comparing]);
  useEffect(() => setHasClip(!!readClip()), []);
  const commit = (n: PhotoAdjust, now = false) => {
    setA(n);
    if (t.current) clearTimeout(t.current);
    const go = () => onChange(Object.keys(n).length ? n : undefined);
    if (now) go();
    else t.current = setTimeout(go, 140);
  };
  const swatches = [brand.colors.primary, brand.colors.accent, brand.colors.secondary, brand.colors.dark, "#FFFFFF"];
  const presets = adjustPresets(brand.colors);
  const empty = !Object.keys(a).length;

  // před / po – podržet tlačítko
  const showOriginal = (on: boolean) => {
    if (on === comparing || empty) return;
    setComparing(on);
    onChange(on ? undefined : Object.keys(a).length ? a : undefined);
  };

  const used = (keys: (keyof PhotoAdjust)[]) => keys.some((k) => {
    const v = a[k];
    return typeof v === "number" ? v !== 0 : typeof v === "boolean" ? v : !!v && (v as { amount: number }).amount > 0;
  });
  const sideSel = (v: "left" | "right" | "both", on: (s: "left" | "right" | "both") => void) => (
    <Segmented size="sm" value={v} onChange={on} options={[{ value: "left", label: "Zleva" }, { value: "both", label: "Obě" }, { value: "right", label: "Zprava" }]} />
  );
  const split = a.split ?? { shadows: mixColor(brand.colors.primary, brand.colors.dark, 0.35), highlights: mixColor(brand.colors.accent, "#FFFFFF", 0.55), amount: 0, balance: 0 };

  return (
    <div className="mt-2 space-y-2.5 rounded-md border border-line bg-paper p-2.5">
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={empty}
          onPointerDown={() => showOriginal(true)}
          onPointerUp={() => showOriginal(false)}
          onPointerLeave={() => showOriginal(false)}
          onKeyDown={(e) => e.key === " " && showOriginal(true)}
          onKeyUp={() => showOriginal(false)}
          className={cx("h-7 select-none rounded-md border px-2 text-[12px] font-semibold", comparing ? "border-signal bg-signal text-white" : "border-line bg-white", empty && "opacity-40")}
          title="Podržte – ukáže původní fotku"
        >
          {comparing ? "Původní" : "Před / po"}
        </button>
        <Button size="sm" variant={a.flip ? "primary" : "secondary"} onClick={() => commit({ ...a, flip: a.flip ? undefined : true }, true)} title="Zrcadlit fotku vodorovně (hráč se otočí)">
          Zrcadlit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon="copy"
          disabled={empty}
          onClick={() => {
            clip = a;
            try {
              localStorage.setItem(CLIP_KEY, JSON.stringify(a));
            } catch {
              /* bez úložiště – jen v paměti */
            }
            setHasClip(true);
            toast("Úpravy zkopírované – vložte je u jiné fotky");
          }}
        >
          Kopírovat
        </Button>
        <Button size="sm" variant="ghost" disabled={!hasClip} onClick={() => {
          const c = readClip();
          if (c) commit(cutout ? { ...c } : { ...c, rim: undefined }, true);
        }}>
          Vložit
        </Button>
      </div>
      <div>
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-mute">Předvolby</div>
        <div className="flex flex-wrap gap-1">
          {presets.map((p) => (
            <Button key={p.id} size="sm" variant={p.id === "studio" ? "primary" : "secondary"} onClick={() => commit({ ...(cutout || p.id === "none" ? p.adj : { ...p.adj, rim: undefined }), ...(a.flip ? { flip: true } : {}) }, true)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>
      <Section title="Tón" active={used(["exposure", "contrast", "highlights", "shadows", "whites", "blacks"])} open>
        <Sliders list={TONE} a={a} set={(k, n) => commit({ ...a, [k]: n })} />
      </Section>
      <Section title="Barvy" active={used(["vibrance", "saturation", "temperature", "tint"])}>
        <Sliders list={COLOR} a={a} set={(k, n) => commit({ ...a, [k]: n })} />
      </Section>
      <Section title="Detail" active={used(["clarity", "sharpen"])}>
        <Sliders list={DETAIL} a={a} set={(k, n) => commit({ ...a, [k]: n })} />
      </Section>
      <Section title="Sladit s pozadím (Match Color)" active={used(["match"])}>
        <Range label="Síla" min={0} v={a.match?.amount ?? 0} on={(n) => commit({ ...a, match: { lum: a.match?.lum ?? 55, color: a.match?.color ?? 60, amount: n } })} />
        <div className="grid grid-cols-2 gap-x-3">
          <Range label="Jas" min={0} v={a.match?.lum ?? 55} on={(n) => commit({ ...a, match: { amount: a.match?.amount || 50, color: a.match?.color ?? 60, lum: n } })} />
          <Range label="Barva" min={0} v={a.match?.color ?? 60} on={(n) => commit({ ...a, match: { amount: a.match?.amount || 50, lum: a.match?.lum ?? 55, color: n } })} />
        </div>
      </Section>
      <Section title="Barevné tónování (stíny / světla)" active={used(["split", "grade"])}>
        <Range label="Síla" min={0} v={split.amount} on={(n) => commit({ ...a, split: { ...split, amount: n } })} />
        <Range label="Vyvážení (stíny ↔ světla)" v={split.balance ?? 0} on={(n) => commit({ ...a, split: { ...split, amount: split.amount || 40, balance: n } })} />
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
            <span>Stíny</span>
            <Color swatches={swatches} v={split.shadows} on={(c) => commit({ ...a, split: { ...split, amount: split.amount || 40, shadows: c } })} />
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
            <span>Světla</span>
            <Color swatches={swatches} v={split.highlights} on={(c) => commit({ ...a, split: { ...split, amount: split.amount || 40, highlights: c } })} />
          </div>
        </div>
        <div className="border-t border-dashed border-line pt-2">
          <Range label="Jen hluboké stíny do barvy" min={0} v={a.grade?.amount ?? 0} on={(n) => commit({ ...a, grade: { color: a.grade?.color ?? brand.colors.secondary, amount: n } })} />
          <Color swatches={swatches} v={a.grade?.color ?? brand.colors.secondary} on={(c) => commit({ ...a, grade: { amount: a.grade?.amount || 40, color: c } })} />
        </div>
      </Section>
      <Section title="Efekty" active={used(["glow", "fade", "vignette", "mono"])}>
        <Sliders list={FX} a={a} set={(k, n) => commit({ ...a, [k]: n })} />
      </Section>
      <Section title="Barevné světlo z boku" active={used(["light"])}>
        <Range label="Síla" min={0} v={a.light?.amount ?? 0} on={(n) => commit({ ...a, light: { color: a.light?.color ?? brand.colors.primary, side: a.light?.side ?? "both", amount: n } })} />
        <div className="flex flex-wrap items-center justify-between gap-1">
          <Color swatches={swatches} v={a.light?.color ?? brand.colors.primary} on={(c) => commit({ ...a, light: { amount: a.light?.amount || 35, side: a.light?.side ?? "both", color: c } })} />
          {sideSel(a.light?.side ?? "both", (sd) => commit({ ...a, light: { amount: a.light?.amount || 35, color: a.light?.color ?? brand.colors.primary, side: sd } }))}
        </div>
      </Section>
      {cutout && (
        <Section title="Rim light (světlo na hranách)" active={used(["rim"])}>
          <div className="grid grid-cols-2 gap-x-3">
            <Range label="Síla" min={0} v={a.rim?.amount ?? 0} on={(n) => commit({ ...a, rim: { color: a.rim?.color ?? brand.colors.primary, side: a.rim?.side ?? "both", width: a.rim?.width ?? 30, amount: n } })} />
            <Range label="Šířka" min={5} v={a.rim?.width ?? 30} on={(n) => commit({ ...a, rim: { color: a.rim?.color ?? brand.colors.primary, side: a.rim?.side ?? "both", amount: a.rim?.amount || 60, width: n } })} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1">
            <Color swatches={swatches} v={a.rim?.color ?? brand.colors.primary} on={(c) => commit({ ...a, rim: { amount: a.rim?.amount || 60, side: a.rim?.side ?? "both", width: a.rim?.width ?? 30, color: c } })} />
            {sideSel(a.rim?.side ?? "both", (sd) => commit({ ...a, rim: { amount: a.rim?.amount || 60, color: a.rim?.color ?? brand.colors.primary, width: a.rim?.width ?? 30, side: sd } }))}
          </div>
        </Section>
      )}
      <Button size="sm" variant="ghost" icon="refresh" onClick={() => commit({}, true)}>
        Vynulovat úpravy
      </Button>
    </div>
  );
}
