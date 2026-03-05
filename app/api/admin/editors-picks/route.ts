import { NextRequest, NextResponse } from "next/server";
import {
  getUpcomingEditorsPicks,
  getPicksForWeek,
  addEditorsPick,
  removeEditorsPick,
  getUpcomingSunday,
} from "@/app/lib/editors-picks-db";

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminToken = request.cookies.get("via_admin_token")?.value;
  if (adminToken && adminToken === hashPassword(adminPassword)) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get("week");
    const picks = week ? await getPicksForWeek(week) : await getUpcomingEditorsPicks();
    return NextResponse.json({ picks, weekStart: week || getUpcomingSunday() });
  } catch (error) {
    console.error("Failed to fetch editor's picks:", error);
    return NextResponse.json({ error: "Failed to fetch picks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { productId } = await request.json();
    if (!productId || typeof productId !== "number") {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }
    await addEditorsPick(productId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to add pick";
    const status = msg.includes("Maximum") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { productId, weekStart } = await request.json();
    if (!productId || !weekStart) {
      return NextResponse.json({ error: "productId and weekStart required" }, { status: 400 });
    }
    await removeEditorsPick(productId, weekStart);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to remove editor's pick:", error);
    return NextResponse.json({ error: "Failed to remove pick" }, { status: 500 });
  }
}
