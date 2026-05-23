import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getUserCollections, canViewCollections } from "@/app/lib/user-collections-db";

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
 const session = await auth();
 if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const { userId } = await params;
 const allowed = await canViewCollections(session.user.id, userId);
 if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

 const collections = await getUserCollections(userId);
 return NextResponse.json({ collections });
}
