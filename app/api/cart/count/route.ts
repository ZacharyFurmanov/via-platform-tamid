import { NextRequest, NextResponse } from "next/server";
import { incrementProductCartCount } from "@/app/lib/cart-db";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { id?: unknown };
  const id = typeof body.id === "number" ? body.id : null;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await incrementProductCartCount(id);
  return NextResponse.json({ ok: true });
}
