import { NextResponse } from "next/server";
import { getMobileUserId } from "@/app/lib/mobileAuth";
import { deleteSavedSearch } from "@/app/lib/saved-searches-db";

export const dynamic = "force-dynamic";

export async function DELETE(
 request: Request,
 { params }: { params: Promise<{ id: string }> },
) {
 const userId = getMobileUserId(request);
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const { id } = await params;
 const numericId = parseInt(id, 10);
 if (!Number.isFinite(numericId)) {
 return NextResponse.json({ error: "Invalid id" }, { status: 400 });
 }

 const ok = await deleteSavedSearch(userId, numericId);
 if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
 return NextResponse.json({ ok: true });
}
