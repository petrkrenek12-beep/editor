import { NextResponse } from "next/server";

// AI asistent – volá Anthropic API. Nastavte ANTHROPIC_API_KEY ve Vercelu.
// Volitelně ANTHROPIC_MODEL (výchozí claude-sonnet-4-5).
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ configured: !!process.env.ANTHROPIC_API_KEY });
}

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return new NextResponse("AI není nastavená: chybí ANTHROPIC_API_KEY.", { status: 501 });
  const { prompt, images } = (await req.json().catch(() => ({}))) as { prompt?: string; images?: { mediaType: string; data: string }[] };
  if (!prompt || typeof prompt !== "string" || prompt.length > 20000) return new NextResponse("Neplatný dotaz.", { status: 400 });
  const imgs = (Array.isArray(images) ? images : []).slice(0, 4).filter((i) => /^image\/(png|jpeg|webp|gif)$/.test(i.mediaType) && typeof i.data === "string");
  const content = [
    ...imgs.map((i) => ({ type: "image", source: { type: "base64", media_type: i.mediaType, data: i.data } })),
    { type: "text", text: prompt },
  ];
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 4000,
      messages: [{ role: "user", content }],
    }),
  });
  if (!r.ok) return new NextResponse(`AI vrátila chybu ${r.status}: ${(await r.text()).slice(0, 300)}`, { status: 502 });
  const j = (await r.json()) as { content?: { type: string; text?: string }[] };
  const text = (j.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
  return NextResponse.json({ text });
}
