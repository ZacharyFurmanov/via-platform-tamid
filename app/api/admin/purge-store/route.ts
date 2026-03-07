import { NextRequest, NextResponse } from "next/server";
import { collection, deleteDoc, getDocs } from "firebase/firestore";
import { getDb } from "@/app/lib/firebase-db";

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

/** DELETE /api/admin/purge-store?slug=kiki-d-design-and-consign */
export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
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
