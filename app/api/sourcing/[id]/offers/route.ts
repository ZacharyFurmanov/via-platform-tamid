import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getSourcingRequestById } from "@/app/lib/sourcing-db";
import { getOffersByRequestId } from "@/app/lib/sourcing-offers-db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify the request belongs to this user
  const req = await getSourcingRequestById(id, session.user.id);
  if (!req) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const offers = await getOffersByRequestId(id);
  return NextResponse.json({ offers });
}
