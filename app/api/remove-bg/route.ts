import { NextResponse } from "next/server";

// Proxy na remove.bg – klíč z REMOVE_BG_API_KEY nebo z hlavičky x-removebg-key (Nastavení v aplikaci).
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const key = req.headers.get("x-removebg-key") || process.env.REMOVE_BG_API_KEY;
  if (!key) return new NextResponse("Chybí API klíč remove.bg (REMOVE_BG_API_KEY nebo Nastavení).", { status: 501 });
  const form = await req.formData();
  const image = form.get("image");
  if (!(image instanceof Blob)) return new NextResponse("Chybí obrázek.", { status: 400 });
  const fd = new FormData();
  fd.append("image_file", image, "photo.png");
  fd.append("size", "auto");
  fd.append("format", "png");
  const r = await fetch("https://api.remove.bg/v1.0/removebg", { method: "POST", headers: { "X-Api-Key": key }, body: fd });
  if (!r.ok) return new NextResponse(`remove.bg: ${r.status} ${(await r.text()).slice(0, 300)}`, { status: 502 });
  return new NextResponse(await r.arrayBuffer(), { headers: { "content-type": "image/png", "cache-control": "no-store" } });
}
