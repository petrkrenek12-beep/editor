import { NextResponse } from "next/server";
import { DEMO_API_DATA, type SportsResource } from "@/lib/data-sources";

// Ukázkové sportovní API: GET /api/sports/matches | results | teams | players | standings | competitions
// Sem napojte skutečný zdroj (cz.basketball, FIBA LiveStats…) – aplikace čte jen toto rozhraní.
export async function GET(_req: Request, ctx: { params: Promise<{ resource: string }> }) {
  const { resource } = await ctx.params;
  const data = DEMO_API_DATA[resource as SportsResource];
  if (!data) return NextResponse.json({ error: "Neznámý zdroj" }, { status: 404 });
  return NextResponse.json(data, { headers: { "access-control-allow-origin": "*" } });
}
