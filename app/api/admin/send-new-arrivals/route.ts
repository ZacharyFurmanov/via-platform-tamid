import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "VYA Insider has been discontinued." }, { status: 410 });
}

export async function GET() {
  return NextResponse.json({ error: "VYA Insider has been discontinued." }, { status: 410 });
}
