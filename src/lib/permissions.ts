import type { Role, TemplateElement } from "./types";

export type Action =
  | "brand.edit"
  | "template.create"
  | "template.edit"
  | "template.delete"
  | "template.lock"
  | "users.manage"
  | "datasource.manage"
  | "graphic.create"
  | "graphic.export"
  | "graphic.delete"
  | "project.manage";

const MATRIX: Record<Role, Action[]> = {
  admin: [
    "brand.edit",
    "template.create",
    "template.edit",
    "template.delete",
    "template.lock",
    "users.manage",
    "datasource.manage",
    "graphic.create",
    "graphic.export",
    "graphic.delete",
    "project.manage",
  ],
  editor: ["graphic.create", "graphic.export", "graphic.delete"],
  viewer: [],
};

export function can(role: Role, action: Action) {
  return MATRIX[role].includes(action);
}

/** Smí uživatel upravit vzhled/pozici prvku? */
export function canEditElement(role: Role, el: TemplateElement) {
  if (role === "admin") return true;
  if (role === "viewer") return false;
  return !el.locked;
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrátor",
  editor: "Editor",
  viewer: "Pouze prohlížení",
};
