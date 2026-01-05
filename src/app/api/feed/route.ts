import { NextResponse } from "next/server";
import { getFeed } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 10;
    const events = await getFeed(isNaN(limit) ? 10 : limit);
    return NextResponse.json({ events });
  } catch (error) {
    console.error("[GET /api/feed]", error);
    return NextResponse.json(
      { error: "Could not load feed." },
      { status: 500 },
    );
  }
}
