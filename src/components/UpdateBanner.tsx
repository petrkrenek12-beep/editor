"use client";
import React from "react";
import { newerDesign, designHash } from "@/lib/demo/seed";
import { upsert } from "@/lib/store";
import type { Template } from "@/lib/types";
import { Button, toast } from "./ui";

/** Upozorní, že k (upravené) šabloně vyšel novější návrh, a nabídne aktualizaci. */
export function UpdateBanner({ template, onUpdated }: { template: Template; onUpdated?: (t: Template) => void }) {
  const fresh = newerDesign(template);
  if (!fresh) return null;
  return (
    <div className="rounded-lg border border-[#FF4800]/40 bg-[#FFF3EC] p-3 text-[13px]">
      <p className="font-semibold">K šabloně „{template.name}“ je nová verze návrhu.</p>
      <p className="mt-0.5 text-mute">Tuto šablonu jste dřív upravoval/a, proto se sama nepřepsala. Aktualizací se vaše úpravy této šablony nahradí novým návrhem.</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="primary"
          onClick={async () => {
            const t = { ...fresh, createdAt: template.createdAt };
            await upsert("templates", t);
            onUpdated?.(t);
            toast("Šablona aktualizována na nový návrh");
          }}
        >
          Aktualizovat šablonu
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            const t = { ...template, baseHash: fresh.baseHash };
            await upsert("templates", t);
            onUpdated?.(t);
          }}
        >
          Ponechat moji verzi
        </Button>
      </div>
    </div>
  );
}
export { designHash };
