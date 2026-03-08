import { NextRequest, NextResponse } from "next/server";
import {
  getAllEditorsPicks,
  addEditorsPick,
  removeEditorsPick,
} from "@/app/lib/editors-picks-db";
import { isAdminRequestAuthorized } from "@/app/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!isAdminRequestAuthorized(request)) {
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
  if (!isAdminRequestAuthorized(request)) {
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
  if (!isAdminRequestAuthorized(request)) {
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
