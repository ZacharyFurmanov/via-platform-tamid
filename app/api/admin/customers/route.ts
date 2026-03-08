import { NextRequest, NextResponse } from "next/server";
import { getCustomerSummaries } from "@/app/lib/analytics-db";
import { isAdminRequestAuthorized } from "@/app/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customers = await getCustomerSummaries();
    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Failed to fetch customer summaries:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}
