import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { removeFriend } from "@/app/lib/friends-db";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: friendId } = await params;
  if (!friendId) {
    return NextResponse.json({ error: "Friend ID required" }, { status: 400 });
  }

  const removed = await removeFriend(session.user.id, friendId);
  if (!removed) {
    return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
