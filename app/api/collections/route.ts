import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getUserCollections, createCollection } from "@/app/lib/user-collections-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const collections = await getUserCollections(session.user.id);
  return NextResponse.json({ collections });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const name = (body.name as string)?.trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const collection = await createCollection(session.user.id, name);
  return NextResponse.json({ collection });
}
