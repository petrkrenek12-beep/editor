"use client";
import React, { useEffect, useRef, useState, type ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// ── Ikony (24×24, tah) ───────────────────────────────────────
const P: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  plus: "M12 5v14M5 12h14",
  layers: "m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  database: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  palette: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-7.8-9-7.8ZM7.5 11.5h.01M10.5 7.5h.01M15.5 7.5h.01",
  stack: "M4 7h16M4 12h16M4 17h10",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  download: "M12 4v11m0 0-4-4m4 4 4-4M5 19h14",
  share: "M12 3v12m0-12L8 7m4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6",
  image: "M4 5h16v14H4zM4 15l4-4 5 5 3-3 4 4M15 9.5h.01",
  text: "M5 6h14M12 6v13M9 19h6",
  square: "M4 4h16v16H4z",
  circle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  line: "M4 12h16",
  pen: "M4 20c4-1 7-4 8-8s4-7 8-8",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z",
  unlock: "M7 11V8a5 5 0 0 1 9.6-2M5 11h14v10H5z",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eyeOff: "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.8M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.4-1M9.9 9.9a3 3 0 0 0 4.2 4.2",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  copy: "M8 8h12v12H8zM4 16V4h12",
  x: "M6 6l12 12M18 6 6 18",
  check: "m5 12 5 5 9-10",
  chevronDown: "m6 9 6 6 6-6",
  chevronLeft: "m15 18-6-6 6-6",
  chevronRight: "m9 18 6-6-6-6",
  up: "m6 15 6-6 6 6",
  down: "m6 9 6 6 6-6",
  sparkles: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6",
  scissors: "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.1 7.9 20 20M8.1 16.1 20 4",
  upload: "M12 20V9m0 0-4 4m4-4 4 4M5 5h14",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  move: "M12 3v18M3 12h18M12 3l-3 3m3-3 3 3M12 21l-3-3m3 3 3-3M3 12l3-3m-3 3 3 3M21 12l-3-3m3 3-3 3",
  refresh: "M20 11a8 8 0 0 0-14.9-3.9L4 9m0-5v5h5M4 13a8 8 0 0 0 14.9 3.9L20 15m0 5v-5h-5",
  menu: "M4 6h16M4 12h16M4 18h16",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0",
  zip: "M6 3h9l5 5v13H6zM11 3v2m0 2v2m0 2v2m0 2h2v3h-2z",
  link: "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  wand: "M15 4V2M15 10V8M11 6h2M17 6h2M4 20 14 10M18 13v2M17 14h2",
};

export function Icon({ name, size = 18, className, stroke = 1.8 }: { name: keyof typeof P | string; size?: number; className?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={P[name] ?? P.square} />
    </svg>
  );
}

// ── Tlačítka ────────────────────────────────────────────────

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "signal";
export function Button({
  variant = "secondary",
  size = "md",
  icon,
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg"; icon?: string }) {
  const v: Record<BtnVariant, string> = {
    primary: "bg-ink text-white hover:bg-ink-3 disabled:bg-ink-4",
    signal: "bg-signal text-white hover:bg-signal-ink disabled:opacity-50",
    secondary: "bg-white text-ink border border-line hover:border-ink-4/40 hover:bg-paper disabled:opacity-50",
    ghost: "text-ink hover:bg-ink/5 disabled:opacity-40",
    danger: "bg-white text-bad border border-line hover:bg-red-50 disabled:opacity-50",
  };
  const s = { sm: "h-8 px-2.5 text-[13px] gap-1.5", md: "h-10 px-3.5 text-sm gap-2", lg: "h-12 px-5 text-[15px] gap-2" }[size];
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center rounded-md font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed select-none whitespace-nowrap",
        v[variant],
        s,
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 15 : 17} />}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, active, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string; active?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cx(
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal disabled:opacity-30",
        active ? "bg-signal-soft text-signal-ink" : "text-mute hover:bg-ink/5 hover:text-ink",
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

// ── Formulářové prvky ────────────────────────────────────────

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 flex items-baseline justify-between gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-mute font-cond">
      <span>{children}</span>
      {hint && <span className="normal-case tracking-normal font-sans font-normal text-[11px]">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-line bg-white px-3 text-[15px] text-ink placeholder:text-mute/60 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/20 disabled:bg-paper disabled:text-mute";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cx(inputCls, "h-10", className)} {...p} />;
});

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputCls, "py-2 leading-snug", className)} {...p} />;
}

export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cx(inputCls, "h-10 appearance-none pr-8", className)} {...p}>
        {children}
      </select>
      <Icon name="chevronDown" size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-mute" />
    </div>
  );
}

export function NumberInput({ value, onChange, step = 1, min, max, className, ...rest }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [draft, setDraft] = useState(String(round(value)));
  useEffect(() => setDraft(String(round(value))), [value]);
  return (
    <input
      type="number"
      inputMode="decimal"
      className={cx(inputCls, "h-9 px-2 text-sm tabular-nums", className)}
      value={draft}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== "" && !Number.isNaN(n)) onChange(n);
      }}
      {...rest}
    />
  );
}
function round(n: number) {
  return Math.round(n * 100) / 100;
}

export function ColorInput({ value, onChange, disabled, id }: { value: string; onChange: (v: string) => void; disabled?: boolean; id?: string }) {
  const hex = /^#[0-9a-f]{6}/i.test(value) ? value.slice(0, 7) : "#000000";
  return (
    <div className="flex items-center gap-2">
      <input id={id} type="color" value={hex} disabled={disabled} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-9 w-10 cursor-pointer rounded border border-line bg-white p-0.5 disabled:cursor-not-allowed" />
      <Input value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="h-9 font-mono text-[13px]" />
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = "md" }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; size?: "sm" | "md" }) {
  return (
    <div className="inline-flex rounded-md border border-line bg-paper p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-[5px] font-semibold transition-colors",
            size === "sm" ? "px-2 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]",
            value === o.value ? "bg-white text-ink shadow-card" : "text-mute hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className={cx("flex cursor-pointer items-center justify-between gap-3 py-1.5 text-sm", disabled && "cursor-not-allowed opacity-50")}>
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-signal" : "bg-ink/20")}
      >
        <span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </button>
    </label>
  );
}

// ── Rozvržení ───────────────────────────────────────────────

export function Card({ children, className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-lg border border-line bg-white", className)} {...p}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-cond text-[13px] font-bold uppercase tracking-[0.1em] text-mute">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-cond text-[32px] font-bold uppercase leading-none tracking-[0.01em] text-ink sm:text-[38px]">{title}</h1>
        {sub && <p className="mt-2 max-w-2xl text-[15px] text-mute">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-white px-6 py-12 text-center">
      <p className="font-cond text-lg font-bold uppercase text-ink">{title}</p>
      {children && <p className="mt-1 max-w-md text-sm text-mute">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "signal" | "ok" | "warn" | "dark" }) {
  const t = {
    neutral: "bg-paper text-mute border-line",
    signal: "bg-signal-soft text-signal-ink border-signal/20",
    ok: "bg-emerald-50 text-ok border-emerald-200",
    warn: "bg-amber-50 text-warn border-amber-200",
    dark: "bg-ink text-white border-ink",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", t)}>{children}</span>;
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" className={cx("flex max-h-[92vh] w-full flex-col rounded-t-xl bg-white shadow-pop sm:rounded-xl", wide ? "sm:max-w-4xl" : "sm:max-w-lg")}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="font-cond text-lg font-bold uppercase tracking-wide">{title}</h3>
          <IconButton icon="x" label="Zavřít" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">{footer}</div>}
      </div>
    </div>
  );
}

/** Potvrzení přímo v UI (window.confirm v artefaktu nefunguje) */
export function useConfirm() {
  const [state, setState] = useState<{ text: string; resolve: (v: boolean) => void } | null>(null);
  const confirm = (text: string) => new Promise<boolean>((resolve) => setState({ text, resolve }));
  const node = (
    <Modal
      open={!!state}
      onClose={() => {
        state?.resolve(false);
        setState(null);
      }}
      title="Potvrzení"
      footer={
        <>
          <Button
            onClick={() => {
              state?.resolve(false);
              setState(null);
            }}
          >
            Zrušit
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              state?.resolve(true);
              setState(null);
            }}
          >
            Potvrdit
          </Button>
        </>
      }
    >
      <p className="text-[15px]">{state?.text}</p>
    </Modal>
  );
  return { confirm, node };
}

// ── Toasty ──────────────────────────────────────────────────

type ToastT = { id: number; text: string; tone: "ok" | "bad" | "info" };
let toasts: ToastT[] = [];
const tl = new Set<(t: ToastT[]) => void>();
export function toast(text: string, tone: ToastT["tone"] = "ok") {
  const t = { id: Date.now() + Math.random(), text, tone };
  toasts = [...toasts, t];
  tl.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    tl.forEach((l) => l(toasts));
  }, tone === "bad" ? 6000 : 3200);
}
export function Toaster() {
  const [list, setList] = useState<ToastT[]>([]);
  useEffect(() => {
    tl.add(setList);
    return () => void tl.delete(setList);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {list.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cx(
            "pointer-events-auto max-w-md rounded-md px-4 py-2.5 text-sm font-semibold shadow-pop",
            t.tone === "ok" && "bg-ink text-white",
            t.tone === "bad" && "bg-bad text-white",
            t.tone === "info" && "bg-white text-ink border border-line",
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)} />;
}

export function FileButton({ accept, onFile, children, icon = "upload", variant = "secondary", size = "md", multiple, disabled }: { accept: string; onFile: (f: File[]) => void; children: ReactNode; icon?: string; variant?: BtnVariant; size?: "sm" | "md" | "lg"; multiple?: boolean; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFile(files);
          e.target.value = "";
        }}
      />
      <Button variant={variant} size={size} icon={icon} disabled={disabled} onClick={() => ref.current?.click()}>
        {children}
      </Button>
    </>
  );
}
