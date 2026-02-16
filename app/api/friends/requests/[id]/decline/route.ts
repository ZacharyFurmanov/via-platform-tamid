import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { declineFriendRequest } from "@/app/lib/friends-db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const requestId = parseInt(id, 10);
  if (isNaN(requestId)) {
    return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
  }

  const declined = await declineFriendRequest(requestId, session.user.id);
  if (!declined) {
    return NextResponse.json({ error: "Request not found or already handled" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
