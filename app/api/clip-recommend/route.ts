import { NextRequest, NextResponse } from "next/server";

/**
 * /api/clip-recommend
 *
 * Proxy that forwards an uploaded necklace image to the Python FastAPI
 * CLIP service and returns the top matching earrings from Pinecone.
 *
 * POST  multipart/form-data  { file: File, top_k?: number }
 */

const CLIP_SERVICE_URL =
  process.env.CLIP_SERVICE_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Please upload a valid image file (JPG, PNG, or WebP)." },
        { status: 400 }
      );
    }

    // Forward the file as multipart/form-data to the Python service
    const upstream = new FormData();
    upstream.append("file", file, file.name);
    upstream.append("top_k", formData.get("top_k")?.toString() ?? "3");

    const response = await fetch(`${CLIP_SERVICE_URL}/embed-and-match`, {
      method: "POST",
      body: upstream,
      // 30-second timeout — CLIP inference can be slow on first cold start
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("CLIP service error:", detail);
      return NextResponse.json(
        { error: "The AI matching service returned an error. Please try again." },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("clip-recommend route error:", err);
    const isTimeout =
      err instanceof Error && err.name === "TimeoutError";
    return NextResponse.json(
      {
        error: isTimeout
          ? "The AI service took too long to respond. Try again in a moment."
          : "Could not reach the AI matching service. Make sure it is running.",
      },
      { status: 503 }
    );
  }
}
