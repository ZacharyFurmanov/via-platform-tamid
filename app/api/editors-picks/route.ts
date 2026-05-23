import { NextResponse } from "next/server";
import { getEveryonesFavorites } from "@/app/lib/editors-picks-db";

export async function GET() {
 try {
 const picks = await getEveryonesFavorites(75);
 return NextResponse.json({ picks });
 } catch (error) {
 console.error("Failed to fetch everyone's favorites:", error);
 return NextResponse.json({ error: "Failed to fetch picks" }, { status: 500 });
 }
}
