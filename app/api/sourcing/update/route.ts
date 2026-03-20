import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { updateSourcingRequest } from "@/app/lib/sourcing-db";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, description, priceMin, priceMax, condition, size, deadline, phone, instagram } = body;

  if (!id || !description || !priceMin || !priceMax || !condition || !deadline) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (Number(priceMin) >= Number(priceMax)) {
    return NextResponse.json({ error: "Max price must be greater than min price" }, { status: 400 });
  }

  const updated = await updateSourcingRequest(id, session.user.id, {
    description: description.trim(),
    priceMin: Number(priceMin),
    priceMax: Number(priceMax),
    condition,
    size: size?.trim() || null,
    deadline,
    userPhone: phone?.trim() || null,
    userInstagram: instagram?.trim() || null,
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Request not found, already matched, or you don't have permission to edit it." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, request: updated });
}
