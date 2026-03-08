import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { stores, storeContactEmails } from "@/app/lib/stores";
import { collection, getDocs } from "firebase/firestore";
import { getDb } from "@/app/lib/firebase-db";

function getStoreSlugFromEmail(email: string): string | null {
  for (const [slug, storeEmail] of Object.entries(storeContactEmails)) {
    if (storeEmail && storeEmail.toLowerCase() === email.toLowerCase()) return slug;
  }
  return null;
}

type ProductDoc = {
  store_slug?: string;
  price?: number;
};

function commissionForPrice(price: number): number {
  if (price < 1000) return price * 0.07;
  if (price < 5000) return price * 0.05;
  return price * 0.03;
}

async function getStoreInventoryMetrics(storeSlug: string): Promise<{
  totalInventoryValue: number;
  viaCommissionPotential: number;
}> {
  const db = getDb();
  const snaps = await getDocs(collection(db, "products"));

  let totalInventoryValue = 0;
  let viaCommissionPotential = 0;

  for (const snap of snaps.docs) {
    const row = snap.data() as ProductDoc;
    if (row.store_slug !== storeSlug) continue;

    const price = Number(row.price ?? 0);
    if (!Number.isFinite(price)) continue;

    totalInventoryValue += price;
    viaCommissionPotential += commissionForPrice(price);
  }

  return {
    totalInventoryValue: Math.round(totalInventoryValue),
    viaCommissionPotential: Math.round(viaCommissionPotential),
  };
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

  // Calculate total inventory value and VIA's tiered commission potential
  let totalInventoryValue = 0;
  let viaCommissionPotential = 0;
  try {
    const metrics = await getStoreInventoryMetrics(storeSlug);
    totalInventoryValue = metrics.totalInventoryValue;
    viaCommissionPotential = metrics.viaCommissionPotential;
  } catch {
    // Non-fatal — dashboard still loads without these figures
  }

  return NextResponse.json({
    storeSlug: store.slug,
    storeName: store.name,
    location: store.location,
    currency: store.currency,
    website: store.website,
    logo: store.logo,
    logoBg: store.logoBg,
    commissionType: store.commissionType,
    totalInventoryValue,
    viaCommissionPotential,
  });
}
