import { NextResponse } from "next/server";

export async function POST() {
 return NextResponse.json({ error: "Membership is no longer available" }, { status: 410 });
}
