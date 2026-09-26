// Kde aplikace běží:
//  - "server": nasazená Next.js aplikace (Vercel) – má API routy /api/*
//  - "artifact": samostatná verze bez serveru (živá ukázka v Claude)
export const TARGET: "server" | "artifact" = process.env.NEXT_PUBLIC_PRESETKA_TARGET === "artifact" ? "artifact" : "server";
export const HAS_SERVER = TARGET === "server";
