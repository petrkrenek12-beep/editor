"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FORMATS } from "@/lib/formats";
import { prepare, renderSync, type HitBox, type RenderEnv } from "@/lib/render";
import type { Frame } from "@/lib/types";
import { cx } from "./ui";

export interface Interaction {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  selectable: (id: string) => boolean;
  editable: (id: string) => boolean;
  /** true = tažení posouvá výřez fotky místo rámu */
  panMode?: (id: string) => boolean;
  onFrame?: (id: string, frame: Frame, done: boolean) => void;
  onPan?: (id: string, dx: number, dy: number, frame: Frame, done: boolean) => void;
}

type Drag =
  | { kind: "move"; id: string; start: Frame; px: number; py: number }
  | { kind: "resize"; id: string; start: Frame; px: number; py: number; h: string }
  | { kind: "pan"; id: string; start: Frame; px: number; py: number; lx: number; ly: number };

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export function GraphicCanvas({
  env,
  interaction,
  maxHeight,
  className,
  onRendered,
}: {
  env: RenderEnv;
  interaction?: Interaction;
  maxHeight?: number;
  className?: string;
  onRendered?: (c: HTMLCanvasElement) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [boxW, setBoxW] = useState(0);
  const [hits, setHits] = useState<HitBox[]>([]);
  const [guides, setGuides] = useState<{ v?: number; h?: number }>({});
  const [loading, setLoading] = useState(true);
  const drag = useRef<Drag | null>(null);
  const fmt = FORMATS[env.format];

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const scale = boxW ? Math.min(boxW / fmt.w, (maxHeight ?? Infinity) / fmt.h) : 0;
  const dispW = Math.round(fmt.w * scale);
  const dispH = Math.round(fmt.h * scale);

  // vykreslení
  const req = useRef(0);
  useEffect(() => {
    if (!scale || !canvas.current) return;
    const id = ++req.current;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const pxScale = Math.min(1, scale * dpr);
    let cancelled = false;
    (async () => {
      const images = await prepare(env);
      if (cancelled || id !== req.current || !canvas.current) return;
      const c = canvas.current;
      const w = Math.round(fmt.w * pxScale);
      const h = Math.round(fmt.h * pxScale);
      if (c.width !== w) c.width = w;
      if (c.height !== h) c.height = h;
      const ctx = c.getContext("2d")!;
      const hb = renderSync(ctx, env, images, pxScale);
      setHits(hb);
      setLoading(false);
      onRendered?.(c);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, scale]);

  const toLocal = (e: React.PointerEvent) => {
    const r = wrap.current!.querySelector("[data-stage]")!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };

  const pick = (x: number, y: number) => {
    if (!interaction) return null;
    for (let i = hits.length - 1; i >= 0; i--) {
      const h = hits[i];
      const f = h.frame;
      if (x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h && interaction.selectable(h.id)) return h;
    }
    return null;
  };

  const snap = (f: Frame): Frame => {
    const T = 10 / Math.max(scale, 0.2);
    const out = { ...f };
    const g: { v?: number; h?: number } = {};
    const cx = f.x + f.w / 2;
    const cy = f.y + f.h / 2;
    if (Math.abs(cx - fmt.w / 2) < T) {
      out.x = fmt.w / 2 - f.w / 2;
      g.v = fmt.w / 2;
    } else if (Math.abs(f.x) < T) out.x = 0;
    else if (Math.abs(f.x + f.w - fmt.w) < T) out.x = fmt.w - f.w;
    if (Math.abs(cy - fmt.h / 2) < T) {
      out.y = fmt.h / 2 - f.h / 2;
      g.h = fmt.h / 2;
    } else if (Math.abs(f.y) < T) out.y = 0;
    else if (Math.abs(f.y + f.h - fmt.h) < T) out.y = fmt.h - f.h;
    setGuides(g);
    return out;
  };

  const onDown = (e: React.PointerEvent) => {
    if (!interaction) return;
    const p = toLocal(e);
    const target = e.target as HTMLElement;
    const handle = target.dataset.handle;
    const sel = interaction.selectedId ? hits.find((h) => h.id === interaction.selectedId) : null;
    if (handle && sel && interaction.editable(sel.id)) {
      drag.current = { kind: "resize", id: sel.id, start: { ...sel.frame }, px: p.x, py: p.y, h: handle };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    // klik uvnitř vybraného má přednost (umožní posun i u překrytých prvků)
    const inSel = sel && p.x >= sel.frame.x && p.x <= sel.frame.x + sel.frame.w && p.y >= sel.frame.y && p.y <= sel.frame.y + sel.frame.h;
    const hit = inSel ? sel : pick(p.x, p.y);
    if (!hit) {
      interaction.onSelect(null);
      return;
    }
    if (hit.id !== interaction.selectedId) interaction.onSelect(hit.id);
    if (interaction.panMode?.(hit.id)) {
      drag.current = { kind: "pan", id: hit.id, start: { ...hit.frame }, px: p.x, py: p.y, lx: p.x, ly: p.y };
    } else if (interaction.editable(hit.id)) {
      drag.current = { kind: "move", id: hit.id, start: { ...hit.frame }, px: p.x, py: p.y };
    } else return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const compute = (d: Drag, x: number, y: number): Frame => {
    const dx = x - d.px;
    const dy = y - d.py;
    if (d.kind === "move") return snap({ ...d.start, x: d.start.x + dx, y: d.start.y + dy });
    const f = { ...d.start };
    const h = (d as { h: string }).h;
    if (h.includes("e")) f.w = Math.max(10, d.start.w + dx);
    if (h.includes("s")) f.h = Math.max(10, d.start.h + dy);
    if (h.includes("w")) {
      f.w = Math.max(10, d.start.w - dx);
      f.x = d.start.x + d.start.w - f.w;
    }
    if (h.includes("n")) {
      f.h = Math.max(10, d.start.h - dy);
      f.y = d.start.y + d.start.h - f.h;
    }
    return f;
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !interaction) return;
    const p = toLocal(e);
    if (d.kind === "pan") {
      interaction.onPan?.(d.id, p.x - d.lx, p.y - d.ly, d.start, false);
      d.lx = p.x;
      d.ly = p.y;
      return;
    }
    interaction.onFrame?.(d.id, round(compute(d, p.x, p.y)), false);
  };

  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setGuides({});
    if (!d || !interaction) return;
    const p = toLocal(e);
    if (d.kind === "pan") interaction.onPan?.(d.id, 0, 0, d.start, true);
    else if (Math.abs(p.x - d.px) > 0.5 || Math.abs(p.y - d.py) > 0.5) interaction.onFrame?.(d.id, round(compute(d, p.x, p.y)), true);
  };

  const sel = interaction?.selectedId ? hits.find((h) => h.id === interaction.selectedId) : null;
  const selEditable = sel && interaction?.editable(sel.id) && !interaction.panMode?.(sel.id);

  return (
    <div ref={wrap} className={cx("relative flex w-full justify-center", className)}>
      <div
        data-stage
        className="relative touch-none select-none overflow-hidden rounded-[3px] bg-ink/10 shadow-[0_20px_50px_-20px_rgba(14,18,24,0.45)]"
        style={{ width: dispW || "100%", height: dispH || 200 }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <canvas ref={canvas} className="block h-full w-full" />
        {loading && <div className="absolute inset-0 animate-pulse bg-ink/10" />}
        {guides.v !== undefined && <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-fuchsia-500" style={{ left: guides.v * scale }} />}
        {guides.h !== undefined && <div className="pointer-events-none absolute left-0 right-0 h-px bg-fuchsia-500" style={{ top: guides.h * scale }} />}
        {sel && (
          <div
            className={cx("pointer-events-none absolute border-[1.5px]", selEditable ? "border-signal" : "border-dashed border-signal/70")}
            style={{ left: sel.frame.x * scale, top: sel.frame.y * scale, width: sel.frame.w * scale, height: sel.frame.h * scale }}
          >
            {selEditable &&
              HANDLES.map((h) => (
                <span
                  key={h}
                  data-handle={h}
                  className="pointer-events-auto absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border-[1.5px] border-signal bg-white"
                  style={{
                    left: h.includes("w") ? 0 : h.includes("e") ? "100%" : "50%",
                    top: h.includes("n") ? 0 : h.includes("s") ? "100%" : "50%",
                    cursor: `${h}-resize`,
                  }}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function round(f: Frame): Frame {
  return { x: Math.round(f.x), y: Math.round(f.y), w: Math.round(f.w), h: Math.round(f.h) };
}

/** Malý náhled (cache podle klíče) */
const thumbCache = new Map<string, string>();
export function Thumb({ env, cacheKey, className }: { env: RenderEnv; cacheKey: string; className?: string }) {
  const [src, setSrc] = useState(thumbCache.get(cacheKey));
  useEffect(() => {
    if (thumbCache.has(cacheKey)) {
      setSrc(thumbCache.get(cacheKey));
      return;
    }
    let dead = false;
    (async () => {
      const f = FORMATS[env.format];
      const c = document.createElement("canvas");
      const s = 360 / f.w;
      c.width = Math.round(f.w * s);
      c.height = Math.round(f.h * s);
      const images = await prepare(env);
      renderSync(c.getContext("2d")!, env, images, s);
      const url = c.toDataURL("image/jpeg", 0.82);
      thumbCache.set(cacheKey, url);
      if (!dead) setSrc(url);
    })();
    return () => {
      dead = true;
    };
  }, [cacheKey, env]);
  const f = FORMATS[env.format];
  return (
    <div className={cx("relative overflow-hidden bg-ink/10", className)} style={{ aspectRatio: `${f.w} / ${f.h}` }}>
      {src ? <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 animate-pulse bg-ink/10" />}
    </div>
  );
}
