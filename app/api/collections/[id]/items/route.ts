import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getCollectionItems, addToCollection, canViewCollections } from "@/app/lib/user-collections-db";
import { neon } from "@neondatabase/serverless";

async function getCollectionOwner(collectionId: number): Promise<string | null> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  const sql = neon(url);
  const rows = await sql`SELECT user_id FROM user_collections WHERE id = ${collectionId}`;
  return rows[0]?.user_id as string ?? null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const collectionId = parseInt(id);
  if (isNaN(collectionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const ownerId = await getCollectionOwner(collectionId);
  if (!ownerId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = await canViewCollections(session.user.id, ownerId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await getCollectionItems(collectionId);
  return NextResponse.json({ items });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const collectionId = parseInt(id);
  if (isNaN(collectionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const ownerId = await getCollectionOwner(collectionId);
  if (!ownerId || ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { productId, snapshot } = body as { productId: number; snapshot?: Record<string, unknown> };
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });

  await addToCollection(collectionId, productId, snapshot);
  return NextResponse.json({ ok: true });
}
