import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getUserClickHistory, getUserPurchaseHistory } from "@/app/lib/analytics-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [clicks, purchases] = await Promise.all([
    getUserClickHistory(userId),
    getUserPurchaseHistory(userId),
  ]);

  return NextResponse.json({ clicks, purchases });
}
