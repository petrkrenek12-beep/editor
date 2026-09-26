"use client";
import React, { useEffect, useState } from "react";
import { aiAvailability, suggest, type AiSuggestion } from "@/lib/ai";
import type { DataRecord, Template } from "@/lib/types";
import { Badge, Button, Label, Select, Spinner, Textarea, toast, cx } from "./ui";

const TONES = ["věcný zpravodajský", "emotivní fanouškovský", "klubový oficiální", "odlehčený s nadsázkou"];

export function AiPanel({ template, data, onApply, disabled }: { template: Template; data: DataRecord; onApply: (patch: DataRecord) => void; disabled?: boolean }) {
  const [input, setInput] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<AiSuggestion | null>(null);
  const [avail, setAvail] = useState<{ ok: boolean; reason?: string } | null>(null);
  const textFields = template.fields.filter((f) => f.type === "text" || f.type === "longtext");
  const [target, setTarget] = useState(textFields.find((f) => /headline|title|kicker/.test(f.key))?.key ?? textFields[0]?.key ?? "");

  useEffect(() => {
    aiAvailability().then(setAvail);
  }, []);

  const run = async () => {
    if (!input.trim()) {
      toast("Napište, co se stalo.", "info");
      return;
    }
    setBusy(true);
    try {
      setRes(await suggest(input, template.fields, tone));
    } catch (e) {
      toast((e as Error).message, "bad");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
      toast("Zkopírováno");
    } catch {
      toast("Kopírování není dostupné – označte text ručně.", "info");
    }
  };

  const fieldsFound = res ? Object.entries(res.fields).filter(([k, v]) => v && template.fields.some((f) => f.key === k)) : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-cond text-sm font-bold uppercase tracking-[0.08em] text-mute">AI asistent</h3>
        {avail && !avail.ok && <Badge tone="warn">nedostupné</Badge>}
      </div>
      <p className="text-[13px] text-mute">Navrhne titulek, teaser a text příspěvku. Design šablony nemění.</p>
      <div>
        <Label htmlFor="ai-in">Co se stalo</Label>
        <Textarea id="ai-in" rows={3} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Nymburk porazil Brno 92:78 a postupuje do finále." disabled={disabled} />
      </div>
      <div>
        <Label htmlFor="ai-tone">Tón</Label>
        <Select id="ai-tone" value={tone} onChange={(e) => setTone(e.target.value)}>
          {TONES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </div>
      <Button variant="signal" icon="sparkles" className="w-full" onClick={run} disabled={disabled || busy || (avail !== null && !avail.ok)}>
        {busy ? (
          <>
            <Spinner /> Přemýšlím…
          </>
        ) : (
          "Navrhnout texty"
        )}
      </Button>
      {avail && !avail.ok && <p className="text-[12px] text-warn">{avail.reason}</p>}

      {res && (
        <div className="space-y-4 pt-2">
          {res.headlines.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <Label>Titulky</Label>
                {textFields.length > 0 && (
                  <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-7 rounded border border-line bg-white px-1 text-[12px]" aria-label="Pole pro titulek">
                    {textFields.map((f) => (
                      <option key={f.key} value={f.key}>
                        → {f.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="space-y-1.5">
                {res.headlines.map((h, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onApply({ [target]: h });
                      toast("Titulek vložen do grafiky");
                    }}
                    className={cx("w-full rounded-md border border-line px-3 py-2 text-left text-sm font-semibold hover:border-signal hover:bg-signal-soft")}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}
          {fieldsFound.length > 0 && (
            <div className="rounded-md border border-line p-2.5">
              <Label>Rozpoznaná data</Label>
              <ul className="mb-2 space-y-0.5 text-[13px]">
                {fieldsFound.map(([k, v]) => (
                  <li key={k}>
                    <span className="text-mute">{template.fields.find((f) => f.key === k)?.label}:</span> <b>{v}</b>
                  </li>
                ))}
              </ul>
              <Button size="sm" onClick={() => onApply(Object.fromEntries(fieldsFound))}>
                Vyplnit do grafiky
              </Button>
            </div>
          )}
          {res.teaser && <CopyBlock label="Teaser" text={res.teaser} onCopy={copy} />}
          {res.social && <CopyBlock label="Příspěvek" text={`${res.social}\n\n${res.hashtags.join(" ")}`} onCopy={copy} />}
        </div>
      )}
    </div>
  );
}

function CopyBlock({ label, text, onCopy }: { label: string; text: string; onCopy: (t: string) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Label>{label}</Label>
        <button type="button" onClick={() => onCopy(text)} className="text-[12px] font-semibold text-signal hover:underline">
          Kopírovat
        </button>
      </div>
      <p className="whitespace-pre-wrap rounded-md bg-paper p-2.5 text-[13px] leading-relaxed">{text}</p>
    </div>
  );
}
