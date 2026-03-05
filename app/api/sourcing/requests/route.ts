import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getUserSourcingRequests } from "@/app/lib/sourcing-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await getUserSourcingRequests(session.user.id);
  return NextResponse.json({ requests });
}
