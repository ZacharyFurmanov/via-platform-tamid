import { NextRequest, NextResponse } from "next/server";
import { getInventoryStats } from "@/app/lib/analytics-db";
import { isAdminRequestAuthorized } from "@/app/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stats = await getInventoryStats();
  return NextResponse.json(stats);
}
