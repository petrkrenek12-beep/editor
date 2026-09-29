import { NextResponse } from "next/server";
import { BlobNotFoundError, del, get, head, list } from "@vercel/blob";

// Synchronizace mezi zařízeními přes Vercel Blob.
// Potřebné proměnné: BLOB_READ_WRITE_TOKEN (přidá Vercel po vytvoření Blob úložiště)
// a APP_PASSWORD (heslo, které zadáte v aplikaci). Volitelně BLOB_ACCESS=private.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREFIX = "presetka/state/";
const CURRENT = "presetka/state/current.json";
const access = () => (process.env.BLOB_ACCESS === "private" ? "private" : "public") as "public" | "private";

function authorized(req: Request) {
  const pw = process.env.APP_PASSWORD;
  return !!pw && req.headers.get("x-presetka-key") === pw;
}

export async function GET(req: Request) {
  const op = new URL(req.url).searchParams.get("op");
  if (op === "status") {
    return NextResponse.json({
      blob: !!process.env.BLOB_READ_WRITE_TOKEN,
      password: !!process.env.APP_PASSWORD,
      access: access(),
    });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return new NextResponse("Chybí úložiště Vercel Blob (BLOB_READ_WRITE_TOKEN).", { status: 501 });
  if (!authorized(req)) return new NextResponse("Špatné heslo pro synchronizaci.", { status: 401 });

  if (op === "latest") {
    // Stav je v jednom souboru (přepisuje se) – head() je levná operace.
    try {
      const h = await head(CURRENT);
      return NextResponse.json({ url: h.url, uploadedAt: h.uploadedAt, access: access() }, { headers: { "cache-control": "no-store" } });
    } catch (e) {
      if (!(e instanceof BlobNotFoundError)) throw e;
    }
    // Starší verze aplikace ukládala stav do více souborů – najdeme nejnovější a staré smažeme
    const r = await list({ prefix: PREFIX, limit: 1000 });
    const old = r.blobs.filter((b) => b.pathname !== CURRENT).sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
    const newest = old[0];
    return NextResponse.json(newest ? { url: newest.url, uploadedAt: newest.uploadedAt, access: access(), legacy: old.map((b) => b.url) } : null, { headers: { "cache-control": "no-store" } });
  }

  if (op === "get") {
    // čtení u soukromého úložiště (přes server)
    const url = new URL(req.url).searchParams.get("url");
    if (!url) return new NextResponse("Chybí url.", { status: 400 });
    const r = await get(url, { access: "private", useCache: false });
    if (!r || !r.stream) return new NextResponse("Nenalezeno.", { status: 404 });
    return new NextResponse(r.stream as unknown as ReadableStream, {
      headers: { "content-type": r.blob.contentType ?? "application/octet-stream", "cache-control": "no-store" },
    });
  }
  return new NextResponse("Neznámá operace.", { status: 400 });
}

// Smazání souborů v cloudu (smazané fotky, staré verze stavu). Mazání je ve Vercel Blob zdarma.
export async function POST(req: Request) {
  const op = new URL(req.url).searchParams.get("op");
  if (!process.env.BLOB_READ_WRITE_TOKEN) return new NextResponse("Chybí úložiště.", { status: 501 });
  if (!authorized(req)) return new NextResponse("Špatné heslo pro synchronizaci.", { status: 401 });
  if (op !== "delete") return new NextResponse("Neznámá operace.", { status: 400 });
  const { urls } = (await req.json().catch(() => ({}))) as { urls?: string[] };
  const list0 = (urls ?? []).filter((u) => typeof u === "string" && u.includes("/presetka/")).slice(0, 500);
  if (list0.length) await del(list0);
  return NextResponse.json({ deleted: list0.length });
}
