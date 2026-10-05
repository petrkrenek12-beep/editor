"use client";
import React, { useEffect, useRef, useState } from "react";
import { adjustPresets, type PhotoAdjust } from "@/lib/adjust";
import type { BrandKit } from "@/lib/types";
import { Button, cx, Segmented } from "./ui";

type NumKey = "exposure" | "contrast" | "shadows" | "highlights" | "saturation" | "temperature" | "tint" | "clarity";
const SLIDERS: { k: NumKey; label: string; min?: number; bar?: string }[] = [
  { k: "exposure", label: "Expozice" },
  { k: "contrast", label: "Kontrast" },
  { k: "shadows", label: "Stíny" },
  { k: "highlights", label: "Světla" },
  { k: "saturation", label: "Sytost", bar: "linear-gradient(90deg,#888,#e33)" },
  { k: "temperature", label: "Teplota", bar: "linear-gradient(90deg,#2a5cff,#eee,#ffd400)" },
  { k: "tint", label: "Odstín", bar: "linear-gradient(90deg,#1db954,#eee,#d03fd0)" },
  { k: "clarity", label: "Clarity (detail)", min: 0 },
];

/** Úpravy fotky jako Quick Adjustments + nasvícení do barev grafiky. */
export function AdjustPanel({ value, onChange, brand, cutout }: { value: PhotoAdjust | undefined; onChange: (a: PhotoAdjust | undefined) => void; brand: BrandKit; cutout?: boolean }) {
  const [a, setA] = useState<PhotoAdjust>(value ?? {});
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => setA(value ?? {}), [value]);
  const commit = (n: PhotoAdjust, now = false) => {
    setA(n);
    if (t.current) clearTimeout(t.current);
    const go = () => onChange(Object.keys(n).length ? n : undefined);
    if (now) go();
    else t.current = setTimeout(go, 140);
  };
  const swatches = [brand.colors.primary, brand.colors.accent, brand.colors.secondary, brand.colors.dark, "#FFFFFF"];
  const presets = adjustPresets(brand.colors);

  const Color = ({ v, on }: { v: string; on: (c: string) => void }) => (
    <div className="flex items-center gap-1">
      {swatches.map((c) => (
        <button key={c} type="button" onClick={() => on(c)} className={cx("h-5 w-5 rounded-full border", v.toLowerCase() === c.toLowerCase() ? "border-ink ring-2 ring-signal" : "border-line")} style={{ background: c }} aria-label={c} />
      ))}
      <input type="color" value={v} onChange={(e) => on(e.target.value)} className="h-5 w-6 rounded border border-line" aria-label="Vlastní barva" />
    </div>
  );
  const Range = ({ label, v, on, min = -100, max = 100, bar }: { label: string; v: number; on: (n: number) => void; min?: number; max?: number; bar?: string }) => (
    <label className="block">
      <div className="flex justify-between text-[11px]">
        <span className="font-semibold">{label}</span>
        <button type="button" className="tabular-nums text-mute" onClick={() => on(0)} title="Vynulovat">
          {v > 0 ? "+" : ""}
          {v}
        </button>
      </div>
      <input type="range" min={min} max={max} value={v} onChange={(e) => on(Number(e.target.value))} className="h-1.5 w-full accent-[#2A4BFF]" style={bar ? { background: bar, borderRadius: 4 } : undefined} />
    </label>
  );
  const sideSel = (v: "left" | "right" | "both", on: (s: "left" | "right" | "both") => void) => (
    <Segmented size="sm" value={v} onChange={on} options={[{ value: "left", label: "Zleva" }, { value: "both", label: "Obě" }, { value: "right", label: "Zprava" }]} />
  );

  return (
    <div className="mt-2 space-y-3 rounded-md border border-line bg-paper p-2.5">
      <div>
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-mute">Předvolby</div>
        <div className="flex flex-wrap gap-1">
          {presets.map((p) => (
            <Button key={p.id} size="sm" variant={p.id === "studio" ? "primary" : "secondary"} onClick={() => commit(cutout || p.id === "none" ? p.adj : { ...p.adj, rim: undefined }, true)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {SLIDERS.map((s) => (
          <Range key={s.k} label={s.label} v={a[s.k] ?? 0} min={s.min} bar={s.bar} on={(n) => commit({ ...a, [s.k]: n })} />
        ))}
      </div>
      <div className="space-y-1.5 border-t border-line pt-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-mute">Barevné světlo z boku</div>
        <Range label="Síla" min={0} v={a.light?.amount ?? 0} on={(n) => commit({ ...a, light: { color: a.light?.color ?? brand.colors.primary, side: a.light?.side ?? "both", amount: n } })} />
        <div className="flex flex-wrap items-center justify-between gap-1">
          <Color v={a.light?.color ?? brand.colors.primary} on={(c) => commit({ ...a, light: { amount: a.light?.amount || 35, side: a.light?.side ?? "both", color: c } })} />
          {sideSel(a.light?.side ?? "both", (sd) => commit({ ...a, light: { amount: a.light?.amount || 35, color: a.light?.color ?? brand.colors.primary, side: sd } }))}
        </div>
      </div>
      {cutout && (
        <div className="space-y-1.5 border-t border-line pt-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-mute">Rim light (světlo na hranách)</div>
          <div className="grid grid-cols-2 gap-x-3">
            <Range label="Síla" min={0} v={a.rim?.amount ?? 0} on={(n) => commit({ ...a, rim: { color: a.rim?.color ?? brand.colors.primary, side: a.rim?.side ?? "both", width: a.rim?.width ?? 30, amount: n } })} />
            <Range label="Šířka" min={5} v={a.rim?.width ?? 30} on={(n) => commit({ ...a, rim: { color: a.rim?.color ?? brand.colors.primary, side: a.rim?.side ?? "both", amount: a.rim?.amount || 60, width: n } })} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1">
            <Color v={a.rim?.color ?? brand.colors.primary} on={(c) => commit({ ...a, rim: { amount: a.rim?.amount || 60, side: a.rim?.side ?? "both", width: a.rim?.width ?? 30, color: c } })} />
            {sideSel(a.rim?.side ?? "both", (sd) => commit({ ...a, rim: { amount: a.rim?.amount || 60, color: a.rim?.color ?? brand.colors.primary, width: a.rim?.width ?? 30, side: sd } }))}
          </div>
        </div>
      )}
      <div className="space-y-1.5 border-t border-line pt-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-mute">Tónování stínů</div>
        <Range label="Síla" min={0} v={a.grade?.amount ?? 0} on={(n) => commit({ ...a, grade: { color: a.grade?.color ?? brand.colors.secondary, amount: n } })} />
        <Color v={a.grade?.color ?? brand.colors.secondary} on={(c) => commit({ ...a, grade: { amount: a.grade?.amount || 40, color: c } })} />
      </div>
      <Button size="sm" variant="ghost" icon="refresh" onClick={() => commit({}, true)}>
        Vynulovat úpravy
      </Button>
    </div>
  );
}
