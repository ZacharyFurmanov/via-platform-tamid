import { NextRequest, NextResponse } from "next/server";
import {
  getAllEditorsPicks,
  addEditorsPick,
  removeEditorsPick,
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
    const picks = await getAllEditorsPicks();
    return NextResponse.json({ picks });
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }
    await removeEditorsPick(productId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to remove editor's pick:", error);
    return NextResponse.json({ error: "Failed to remove pick" }, { status: 500 });
  }
}
