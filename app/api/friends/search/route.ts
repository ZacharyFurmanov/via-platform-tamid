import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getUserByPhone } from "@/app/lib/friends-db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "phone parameter required" }, { status: 400 });
  }

  const normalized = phone.replace(/\D/g, "");
  if (normalized.length < 10) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const user = await getUserByPhone(normalized);
  if (!user || user.id === session.user.id) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    user: { id: user.id, name: user.name, image: user.image },
  });
}
