import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { stores, storeContactEmails } from "@/app/lib/stores";

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

  const store = stores.find((s) => s.slug === storeSlug);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  return NextResponse.json({
    storeSlug: store.slug,
    storeName: store.name,
    location: store.location,
    currency: store.currency,
    website: store.website,
    logo: store.logo,
    logoBg: store.logoBg,
  });
}
