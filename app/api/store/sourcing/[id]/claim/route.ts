import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { storeContactEmails } from "@/app/lib/stores";
import { claimSourcingRequest } from "@/app/lib/sourcing-db";

function getStoreSlugFromEmail(email: string): string | null {
  for (const [slug, storeEmail] of Object.entries(storeContactEmails)) {
    if (storeEmail && storeEmail.toLowerCase() === email.toLowerCase()) return slug;
  }
  return null;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storeSlug = getStoreSlugFromEmail(session.user.email);
  if (!storeSlug) {
    return NextResponse.json({ error: "Not a registered store partner" }, { status: 403 });
  }

  const { id } = await params;
  const result = await claimSourcingRequest(id, storeSlug);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
