import { NextRequest, NextResponse } from "next/server";
import { getClickAnalytics } from "@/app/lib/analytics-db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "all";

    const data = await getClickAnalytics(range);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Analytics] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
