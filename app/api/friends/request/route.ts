import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { sendFriendRequest, getUserByPhone } from "@/app/lib/friends-db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, phone } = await request.json();

  let targetUserId = userId;

  // If phone provided, look up user by phone
  if (!targetUserId && phone) {
    const normalized = phone.replace(/\D/g, "");
    const user = await getUserByPhone(normalized);
    if (!user) {
      return NextResponse.json({ error: "User not found", notFound: true }, { status: 404 });
    }
    targetUserId = user.id;
  }

  if (!targetUserId) {
    return NextResponse.json({ error: "userId or phone required" }, { status: 400 });
  }

  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: "Cannot send friend request to yourself" }, { status: 400 });
  }

  const result = await sendFriendRequest(session.user.id, targetUserId);
  return NextResponse.json(result);
}
