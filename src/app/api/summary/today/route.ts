import { NextResponse } from "next/server";
import { getSummary } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[GET /api/summary/today]", error);
    return NextResponse.json(
      { error: "Could not load summary." },
      { status: 500 },
    );
  }
}
