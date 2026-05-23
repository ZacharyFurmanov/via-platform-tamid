import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { removeFromCollection } from "@/app/lib/user-collections-db";
import { neon } from "@neondatabase/serverless";

async function getCollectionOwner(collectionId: number): Promise<string | null> {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) return null;
 const sql = neon(url);
 const rows = await sql`SELECT user_id FROM user_collections WHERE id = ${collectionId}`;
 return rows[0]?.user_id as string ?? null;
}

export async function DELETE(
 _req: Request,
 { params }: { params: Promise<{ id: string; productId: string }> }
) {
 const session = await auth();
 if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const { id, productId } = await params;
 const collectionId = parseInt(id);
 const pid = parseInt(productId);
 if (isNaN(collectionId) || isNaN(pid)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

 const ownerId = await getCollectionOwner(collectionId);
 if (!ownerId || ownerId !== session.user.id) {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }

 await removeFromCollection(collectionId, pid);
 return NextResponse.json({ ok: true });
}
