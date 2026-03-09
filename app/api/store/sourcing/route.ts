import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { storeContactEmails } from "@/app/lib/stores";
import { getOpenSourcingRequests, getSourcingRequestsByStore } from "@/app/lib/sourcing-db";

function getStoreSlugFromEmail(email: string): string | null {
  for (const [slug, storeEmail] of Object.entries(storeContactEmails)) {
    if (storeEmail && storeEmail.toLowerCase() === email.toLowerCase()) return slug;
  }
  return null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storeSlug = getStoreSlugFromEmail(session.user.email);
  if (!storeSlug) {
    return NextResponse.json({ error: "Not a registered store partner" }, { status: 403 });
  }

  const [open, mine] = await Promise.all([
    getOpenSourcingRequests(storeSlug),
    getSourcingRequestsByStore(storeSlug),
  ]);

  return NextResponse.json({ open, mine });
}
