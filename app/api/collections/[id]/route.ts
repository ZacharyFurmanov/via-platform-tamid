import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { deleteCollection, renameCollection } from "@/app/lib/user-collections-db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
 const session = await auth();
 if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const { id } = await params;
 const collectionId = parseInt(id);
 if (isNaN(collectionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

 const body = await request.json();
 const name = (body.name as string)?.trim();
 if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

 const ok = await renameCollection(session.user.id, collectionId, name);
 if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
 return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
 const session = await auth();
 if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const { id } = await params;
 const collectionId = parseInt(id);
 if (isNaN(collectionId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

 const ok = await deleteCollection(session.user.id, collectionId);
 if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
 return NextResponse.json({ ok: true });
}
