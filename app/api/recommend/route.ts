import { NextRequest, NextResponse } from "next/server";
import { findMatches, findMatchesForUploadedImage } from "@/lib/catalog";

export function GET(request: NextRequest) {
  const necklaceId = request.nextUrl.searchParams.get("necklaceId") ?? "N01";
  const result = findMatches(necklaceId);
  if (!result) return NextResponse.json({ error: "Unknown necklace id" }, { status: 404 });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const features = body?.features;
  if (!Array.isArray(features) || features.length !== 8 || features.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    return NextResponse.json({ error: "A valid eight-value visual profile is required." }, { status: 400 });
  }
  return NextResponse.json({ matches: findMatchesForUploadedImage(features) }, { headers: { "Cache-Control": "no-store" } });
}
