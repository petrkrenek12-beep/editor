"use client";
import React from "react";
import { resolveColor } from "@/lib/color";
import type { BrandKit, Fill, GradientFill } from "@/lib/types";
import { cx, Input, Label, Segmented } from "./ui";

const TOKENS = ["primary", "secondary", "accent", "dark", "light", "text"] as const;
const TOKEN_LABEL: Record<string, string> = { primary: "Primární", secondary: "Sekundární", accent: "Akcent", dark: "Tmavá", light: "Světlá", text: "Text" };

/** Výběr barvy: token z brand kitu nebo vlastní hex. */
export function ColorField({ label, value, onChange, brand, allowCustom = true, id }: { label?: string; value: string; onChange: (v: string) => void; brand: BrandKit; allowCustom?: boolean; id?: string }) {
  const token = value?.startsWith("@") ? value.slice(1).split("/")[0] : null;
  const alpha = value?.startsWith("@") && value.includes("/") ? Number(value.split("/")[1]) : 100;
  const hex = !token && /^#[0-9a-f]{6}/i.test(value) ? value.slice(0, 7) : resolveColor(value?.startsWith("@") ? `@${token}` : "#000000", brand);
  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="flex flex-wrap items-center gap-1.5">
        {TOKENS.map((t) => (
          <button
            key={t}
            type="button"
            title={`${TOKEN_LABEL[t]} (brand kit)`}
            onClick={() => onChange(alpha < 100 ? `@${t}/${alpha}` : `@${t}`)}
            className={cx("h-7 w-7 rounded-full border-2 transition-transform hover:scale-110", token === t ? "border-signal ring-2 ring-signal/30" : "border-white shadow-[0_0_0_1px_#E2E5EA]")}
            style={{ background: (brand.colors as Record<string, string>)[t] }}
          />
        ))}
        {allowCustom && (
          <label className={cx("relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border-2", !token ? "border-signal ring-2 ring-signal/30" : "border-white shadow-[0_0_0_1px_#E2E5EA]")} title="Vlastní barva">
            <span className="absolute inset-0" style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }} />
            <input id={id} type="color" value={hex} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="h-8 font-mono text-[12px]" aria-label="Hodnota barvy" />
        {token && (
          <input
            type="range"
            min={0}
            max={100}
            value={alpha}
            onChange={(e) => onChange(Number(e.target.value) >= 100 ? `@${token}` : `@${token}/${e.target.value}`)}
            className="w-24 accent-[#2A4BFF]"
            title={`Krytí ${alpha} %`}
            aria-label="Krytí barvy"
          />
        )}
      </div>
    </div>
  );
}

export function FillField({ label, value, onChange, brand }: { label: string; value: Fill | undefined; onChange: (f: Fill) => void; brand: BrandKit }) {
  const isGrad = typeof value === "object" && value !== null;
  const g = isGrad ? (value as GradientFill) : null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Segmented
          size="sm"
          value={isGrad ? g!.type : "solid"}
          onChange={(v) => {
            if (v === "solid") onChange(g ? g.stops[0][1] : "@primary");
            else onChange({ type: v as "linear" | "radial", angle: g?.angle ?? 90, stops: g?.stops ?? [[0, typeof value === "string" ? value : "@primary"], [1, "@dark"]] });
          }}
          options={[
            { value: "solid", label: "Barva" },
            { value: "linear", label: "Přechod" },
            { value: "radial", label: "Kruh" },
          ]}
        />
      </div>
      {!isGrad && <ColorField value={(value as string) ?? "#000000"} onChange={onChange} brand={brand} />}
      {g && (
        <div className="space-y-2 rounded-md border border-line p-2">
          <div className="h-6 rounded" style={{ background: `linear-gradient(90deg, ${g.stops.map(([o, c]) => `${resolveColor(c, brand)} ${o * 100}%`).join(",")})` }} />
          {g.stops.map(([o, c], i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-mute">
                Bod {i + 1}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={o}
                  onChange={(e) => onChange({ ...g, stops: g.stops.map((s, j) => (j === i ? [Number(e.target.value), s[1]] : s)) as GradientFill["stops"] })}
                  className="flex-1 accent-[#2A4BFF]"
                  aria-label={`Pozice bodu ${i + 1}`}
                />
                {g.stops.length > 2 && (
                  <button type="button" className="text-bad" onClick={() => onChange({ ...g, stops: g.stops.filter((_, j) => j !== i) })}>
                    ×
                  </button>
                )}
              </div>
              <ColorField value={c} onChange={(v) => onChange({ ...g, stops: g.stops.map((s, j) => (j === i ? [s[0], v] : s)) as GradientFill["stops"] })} brand={brand} />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <button type="button" className="text-[12px] font-semibold text-signal" onClick={() => onChange({ ...g, stops: [...g.stops, [1, "@accent"]] })}>
              + bod
            </button>
            {g.type === "linear" && (
              <label className="ml-auto flex items-center gap-2 text-[12px] text-mute">
                Úhel
                <input type="range" min={0} max={360} value={g.angle ?? 90} onChange={(e) => onChange({ ...g, angle: Number(e.target.value) })} className="w-24 accent-[#2A4BFF]" />
                <span className="w-8 tabular-nums">{g.angle ?? 90}°</span>
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
