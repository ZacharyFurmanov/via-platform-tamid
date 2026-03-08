import { NextRequest, NextResponse } from "next/server";
import { collection, deleteDoc, getDocs } from "firebase/firestore";
import { getDb } from "@/app/lib/firebase-db";
import { isAdminRequestAuthorized } from "@/app/lib/admin-auth";

/** DELETE /api/admin/purge-store?slug=kiki-d-design-and-consign */
export async function DELETE(request: NextRequest) {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug param required" }, { status: 400 });
  }

  const snaps = await getDocs(collection(getDb(), "products"));
  let deleted = 0;

  for (const snap of snaps.docs) {
    const row = snap.data() as { store_slug?: string };
    if (row.store_slug !== slug) continue;
    await deleteDoc(snap.ref);
    deleted += 1;
  }

  return NextResponse.json({ success: true, deleted, slug });
}
