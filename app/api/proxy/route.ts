import { NextResponse } from "next/server";

// Načtení CSV/JSON z cizí URL, když zdroj nepovoluje CORS (např. některé exporty tabulek).
export const runtime = "nodejs";

const MAX = 5 * 1024 * 1024;

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) return new NextResponse("Neplatná URL.", { status: 400 });
  const host = new URL(url).hostname;
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) || host.endsWith(".internal")) return new NextResponse("Tato adresa není povolená.", { status: 400 });
  const r = await fetch(url, { headers: { accept: "text/csv, application/json, text/plain, */*" }, redirect: "follow" });
  if (!r.ok) return new NextResponse(`Zdroj vrátil ${r.status}`, { status: 502 });
  const buf = await r.arrayBuffer();
  if (buf.byteLength > MAX) return new NextResponse("Soubor je příliš velký (max 5 MB).", { status: 413 });
  return new NextResponse(buf, { headers: { "content-type": r.headers.get("content-type") ?? "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
