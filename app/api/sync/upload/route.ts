import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

// Vydává jednorázová oprávnění k nahrání (fotky i velké soubory jdou přímo do Blobu, ne přes server).
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const res = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const pw = process.env.APP_PASSWORD;
        if (!pw || clientPayload !== pw) throw new Error("Špatné heslo pro synchronizaci.");
        if (!pathname.startsWith("presetka/")) throw new Error("Neplatná cesta.");
        return { addRandomSuffix: true, maximumSizeInBytes: 60 * 1024 * 1024 };
      },
    });
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
