import { NextResponse } from "next/server";
import { getCurrentEditorsPicks } from "@/app/lib/editors-picks-db";

export async function GET() {
  try {
    const picks = await getCurrentEditorsPicks();
    return NextResponse.json({ picks });
  } catch (error) {
    console.error("Failed to fetch editor's picks:", error);
    return NextResponse.json({ error: "Failed to fetch picks" }, { status: 500 });
  }
}
