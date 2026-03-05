import { NextResponse } from "next/server";
import { getCustomerSummaries } from "@/app/lib/analytics-db";

export async function GET() {
  try {
    const customers = await getCustomerSummaries();
    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Failed to fetch customer summaries:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}
