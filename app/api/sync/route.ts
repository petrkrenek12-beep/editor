import { NextResponse } from "next/server";
import { del, get, list } from "@vercel/blob";

// Synchronizace mezi zařízeními přes Vercel Blob.
// Potřebné proměnné: BLOB_READ_WRITE_TOKEN (přidá Vercel po vytvoření Blob úložiště)
// a APP_PASSWORD (heslo, které zadáte v aplikaci). Volitelně BLOB_ACCESS=private.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREFIX = "presetka/state/";
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
    const blobs: { url: string; pathname: string; uploadedAt: Date }[] = [];
    let cursor: string | undefined;
    do {
      const r = await list({ prefix: PREFIX, cursor, limit: 1000 });
      blobs.push(...r.blobs);
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    blobs.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
    const newest = blobs[0];
    // úklid – necháme posledních 10 verzí
    const old = blobs.slice(10).map((b) => b.url);
    if (old.length) del(old).catch(() => undefined);
    return NextResponse.json(newest ? { url: newest.url, uploadedAt: newest.uploadedAt, access: access() } : null, { headers: { "cache-control": "no-store" } });
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
