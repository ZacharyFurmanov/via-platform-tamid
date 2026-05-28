import { NextResponse } from "next/server";
import { getCohortRetention } from "@/app/lib/analytics-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getCohortRetention();
  return NextResponse.json({ cohorts: data });
}
