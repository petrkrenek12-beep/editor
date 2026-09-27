"use client";
import React, { useEffect, useRef, useState } from "react";
import { aiAvailability, extractFromScreenshot } from "@/lib/ai";
import type { DataRecord, Team, Template } from "@/lib/types";
import { Button, cx, Icon, Spinner, toast } from "./ui";

/**
 * Vložení screenshotu (Livesport, Flashscore…) → AI vyplní data šablony.
 * Funguje: Ctrl+V kdekoli na stránce, přetažení souboru, výběr fotky z galerie.
 */
export function ScreenshotImport({ template, teams, onData, disabled }: { template: Template; teams: Team[]; onData: (d: DataRecord) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const [avail, setAvail] = useState<{ ok: boolean; reason?: string } | null>(null);
  const [over, setOver] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    aiAvailability().then(setAvail);
  }, []);

  const run = async (img: Blob) => {
    if (busyRef.current || disabled) return;
    if (avail && !avail.ok) {
      toast(avail.reason ?? "AI není dostupná.", "info");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    const url = URL.createObjectURL(img);
    setThumb((old) => {
      if (old) URL.revokeObjectURL(old);
      return url;
    });
    try {
      const d = await extractFromScreenshot(img, template, teams);
      onData(d);
      const n = Object.keys(d).length;
      toast(`Vyplněno ze screenshotu: ${n} ${n === 1 ? "pole" : n < 5 ? "pole" : "polí"}. Zkontrolujte údaje.`);
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  // Ctrl+V kdekoli (když schránka obsahuje obrázek)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const it = items.find((i) => i.type.startsWith("image/"));
      if (!it) return;
      const f = it.getAsFile();
      if (!f) return;
      e.preventDefault();
      void run(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id, avail, disabled]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith("image/"));
        if (f) void run(f);
      }}
      className={cx("rounded-lg border-2 border-dashed p-3 transition-colors", over ? "border-signal bg-signal-soft" : "border-line bg-paper")}
    >
      <input
        ref={file}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void run(f);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white text-mute">
          {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <Icon name="image" size={22} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-tight">{busy ? "Čtu screenshot…" : "Vyplnit ze screenshotu"}</p>
          <p className="text-[12px] leading-snug text-mute">
            {busy ? "AI přepisuje týmy, skóre a časy do šablony." : "Livesport, Flashscore, web ligy – vložte Ctrl+V, přetáhněte nebo vyberte fotku."}
          </p>
        </div>
        <Button size="sm" variant="primary" icon={busy ? undefined : "upload"} disabled={busy || disabled} onClick={() => file.current?.click()}>
          {busy ? <Spinner /> : "Fotka"}
        </Button>
      </div>
      {/* mobil: podržet prst → Vložit */}
      <div
        contentEditable={!busy && !disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-label="Sem vložte screenshot"
        data-ph="Na mobilu: podržte prst tady → Vložit"
        onInput={(e) => ((e.target as HTMLDivElement).innerHTML = "")}
        className="mt-2 min-h-[36px] rounded-md border border-line bg-white px-3 py-2 text-[12px] text-mute outline-none empty:before:content-[attr(data-ph)] focus:border-signal lg:hidden"
      />
      {avail && !avail.ok && <p className="mt-2 text-[12px] text-warn">{avail.reason}</p>}
    </div>
  );
}
