import { NextRequest, NextResponse } from "next/server";
import { findMatches } from "@/lib/catalog";

export function GET(request: NextRequest) {
  const necklaceId = request.nextUrl.searchParams.get("necklaceId") ?? "N01";
  const result = findMatches(necklaceId);
  if (!result) return NextResponse.json({ error: "Unknown necklace id" }, { status: 404 });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
