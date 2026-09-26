"use client";
import React, { useState } from "react";
import { Badge, Button, Card, FileButton, IconButton, Input, Label, Modal, PageHeader, SectionTitle, Segmented, Select, toast, useConfirm } from "@/components/ui";
import { defaultBrand } from "@/lib/demo/seed";
import { buildTemplates } from "@/lib/demo/templates";
import { downloadBlob, slug } from "@/lib/export";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { navigate } from "@/lib/router";
import { TARGET } from "@/lib/runtime";
import { deleteProject, exportProject, importProject, uid, updateSettings, upsert, useApp, useCurrentProject, useCurrentUser } from "@/lib/store";
import type { Project, Role, User } from "@/lib/types";

export function ProjectsPage() {
  const projects = useApp((s) => s.projects);
  const current = useCurrentProject();
  const user = useCurrentUser();
  const templates = useApp((s) => s.templates);
  const graphics = useApp((s) => s.graphics);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [parent, setParent] = useState("Obasketu.cz");
  const [copyFrom, setCopyFrom] = useState(current?.id ?? "");
  const { confirm, node } = useConfirm();
  const manage = can(user.role, "project.manage");

  const create = async () => {
    if (!name.trim()) return toast("Zadejte název projektu.", "info");
    const src = projects.find((p) => p.id === copyFrom);
    const p: Project = {
      id: uid("p-"),
      name: name.trim(),
      parentName: parent.trim() || undefined,
      brand: src ? structuredClone(src.brand) : defaultBrand(),
      teams: src ? src.teams.map((t) => ({ ...t, id: uid("tm-") })) : [],
      createdAt: Date.now(),
    };
    await upsert("projects", p);
    // šablony: zkopírovat z vybraného projektu, jinak demo sada
    const srcT = src ? templates.filter((t) => t.projectId === src.id) : buildTemplates(p.id, { arena: "demo-arena", ball: "demo-ball", player: "demo-player" });
    for (const t of srcT) await upsert("templates", { ...structuredClone(t), id: uid("t-"), projectId: p.id });
    await updateSettings({ currentProjectId: p.id });
    setOpen(false);
    setName("");
    toast(`Projekt ${p.name} vytvořen`);
    navigate("/brand");
  };

  const groups = projects.reduce<Record<string, Project[]>>((a, p) => {
    (a[p.parentName ?? "Bez skupiny"] ??= []).push(p);
    return a;
  }, {});

  return (
    <div className="mx-auto max-w-[1080px] px-4 py-6 lg:px-8 lg:py-8">
      {node}
      <PageHeader
        title="Projekty"
        sub="Každý projekt má vlastní šablony, brand kit, týmy, data a grafiky."
        actions={
          manage && (
            <>
              <FileButton
                accept="application/json,.json"
                onFile={async (f) => {
                  try {
                    await importProject(JSON.parse(await f[0].text()));
                    toast("Projekt obnoven ze zálohy");
                  } catch (e) {
                    toast((e as Error).message, "bad");
                  }
                }}
              >
                Obnovit zálohu
              </FileButton>
              <Button variant="primary" icon="plus" onClick={() => setOpen(true)}>
                Nový projekt
              </Button>
            </>
          )
        }
      />
      <div className="space-y-6">
        {Object.entries(groups).map(([g, list]) => (
          <div key={g}>
            <SectionTitle>{g}</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((p) => (
                <Card key={p.id} className={p.id === current?.id ? "border-ink p-4" : "p-4"}>
                  <div className="flex items-start gap-3">
                    <div className="flex gap-0.5 pt-1">
                      {(["primary", "secondary", "accent"] as const).map((c) => (
                        <span key={c} className="h-8 w-3 rounded-sm" style={{ background: p.brand.colors[c] }} />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-cond text-xl font-bold uppercase">{p.name}</span>
                        {p.id === current?.id && <Badge tone="dark">aktivní</Badge>}
                      </div>
                      <div className="text-[13px] text-mute tabular-nums">
                        {templates.filter((t) => t.projectId === p.id).length} šablon · {graphics.filter((x) => x.projectId === p.id).length} grafik · {p.teams.length} týmů
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.id !== current?.id && (
                      <Button size="sm" variant="primary" onClick={() => updateSettings({ currentProjectId: p.id }).then(() => navigate("/"))}>
                        Přepnout
                      </Button>
                    )}
                    {manage && (
                      <Button
                        size="sm"
                        icon="download"
                        onClick={async () => {
                          const json = JSON.stringify(exportProject(p.id));
                          await downloadBlob(new Blob([json], { type: "application/json" }), `presetka-${slug(p.name)}-zaloha.json`);
                        }}
                      >
                        Záloha
                      </Button>
                    )}
                    {manage && projects.length > 1 && (
                      <IconButton
                        icon="trash"
                        label="Smazat projekt"
                        onClick={async () => {
                          if (await confirm(`Smazat projekt ${p.name} včetně šablon a grafik?`)) await deleteProject(p.id);
                        }}
                      />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nový projekt"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Zrušit</Button>
            <Button variant="primary" onClick={create}>
              Vytvořit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="np-name">Název</Label>
            <Input id="np-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="např. ŽBL" />
          </div>
          <div>
            <Label htmlFor="np-parent" hint="pro seskupení">
              Značka / web
            </Label>
            <Input id="np-parent" value={parent} onChange={(e) => setParent(e.target.value)} />
          </div>
          <div>
            <Label>Začít z</Label>
            <Select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
              <option value="">Demo šablon a výchozího brand kitu</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  Kopie projektu {p.name} (šablony, brand, týmy)
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function SettingsPage() {
  const settings = useApp((s) => s.settings);
  const persistent = useApp((s) => s.persistent);
  const user = useCurrentUser();
  const admin = can(user.role, "users.manage");
  const [key, setKey] = useState(settings.removeBgKey ?? "");
  const setUsers = (users: User[]) => updateSettings({ users });

  return (
    <div className="mx-auto max-w-[900px] px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title="Nastavení" />
      <div className="space-y-6">
        <Card className="p-5">
          <SectionTitle>Uživatelé a role</SectionTitle>
          <p className="mb-4 text-sm text-mute">
            Aktuálně přihlášený: <b className="text-ink">{user.name}</b> ({ROLE_LABEL[user.role]}). V této verzi jsou uživatelé uložení v zařízení – po napojení Supabase Auth se role převezmou z účtů.
          </p>
          <div className="divide-y divide-line rounded-md border border-line">
            {settings.users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <Input value={u.name} disabled={!admin} onChange={(e) => setUsers(settings.users.map((x) => (x.id === u.id ? { ...x, name: e.target.value } : x)))} className="h-9 min-w-[140px] flex-1" aria-label="Jméno" />
                <div className="w-[170px]">
                  <Select
                    value={u.role}
                    disabled={!admin || (u.id === user.id && settings.users.filter((x) => x.role === "admin").length === 1)}
                    onChange={(e) => setUsers(settings.users.map((x) => (x.id === u.id ? { ...x, role: e.target.value as Role } : x)))}
                    aria-label="Role"
                  >
                    {(["admin", "editor", "viewer"] as Role[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                </div>
                {u.id === user.id ? (
                  <Badge tone="dark">vy</Badge>
                ) : (
                  <Button size="sm" onClick={() => updateSettings({ currentUserId: u.id })}>
                    Přihlásit jako
                  </Button>
                )}
                {admin && u.id !== user.id && <IconButton icon="trash" label="Odebrat" onClick={() => setUsers(settings.users.filter((x) => x.id !== u.id))} />}
              </div>
            ))}
          </div>
          {admin && (
            <Button className="mt-3" size="sm" icon="plus" onClick={() => setUsers([...settings.users, { id: uid("u-"), name: "Nový uživatel", role: "editor" }])}>
              Přidat uživatele
            </Button>
          )}
          <div className="mt-4 grid gap-2 text-[13px] sm:grid-cols-3">
            <RoleCard role="Administrátor" items={["brand kit", "tvorba šablon", "uživatelé", "datové zdroje"]} />
            <RoleCard role="Editor" items={["používání šablon", "úprava povolených polí", "export grafik"]} />
            <RoleCard role="Pouze prohlížení" items={["prohlížení grafik a šablon"]} />
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle>Odstranění pozadí</SectionTitle>
          <Segmented
            value={settings.bgProvider}
            onChange={(v) => updateSettings({ bgProvider: v })}
            options={[
              { value: "browser", label: "AI v prohlížeči (zdarma)" },
              { value: "removebg", label: "remove.bg" },
            ]}
          />
          {settings.bgProvider === "removebg" && (
            <div className="mt-3">
              <Label htmlFor="rbg" hint="nebo REMOVE_BG_API_KEY ve Vercelu">
                API klíč remove.bg
              </Label>
              <div className="flex gap-2">
                <Input id="rbg" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="volitelné" />
                <Button onClick={() => updateSettings({ removeBgKey: key || undefined }).then(() => toast("Klíč uložen v tomto zařízení"))}>Uložit</Button>
              </div>
            </div>
          )}
          <p className="mt-3 text-[13px] text-mute">
            AI v prohlížeči běží přímo v zařízení, fotky nikam neodcházejí. Na mobilu první spuštění stáhne model (~40 MB).
            {TARGET === "artifact" && " V živé ukázce není dostupná – funguje po nasazení na Vercel."}
          </p>
        </Card>

        <Card className="p-5">
          <SectionTitle>Úložiště</SectionTitle>
          <p className="text-sm text-mute">
            {persistent
              ? "Data se ukládají v tomto prohlížeči (IndexedDB). Pro přenos na jiné zařízení použijte zálohu projektu v sekci Projekty."
              : "Prohlížeč nepovolil trvalé úložiště (např. anonymní okno) – data vydrží jen do zavření stránky."}
          </p>
        </Card>
      </div>
    </div>
  );
}

function RoleCard({ role, items }: { role: string; items: string[] }) {
  return (
    <div className="rounded-md bg-paper p-3">
      <div className="mb-1 font-cond font-bold uppercase">{role}</div>
      <ul className="list-disc pl-4 text-mute">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
