import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/app/lib/collections-config";
import { getAllCollectionPicks } from "@/app/lib/editors-picks-db";

export const dynamic = "force-dynamic";

/**
 * Public collections list for the mobile app.
 * Returns the editorial collections + their first product image as a cover.
 */
export async function GET() {
 try {
 const picks = await getAllCollectionPicks();

 const collections = COLLECTIONS
 .map((col) => {
  const colPicks = picks[col.slug] ?? [];
  const coverImage = colPicks[0]?.product?.image ?? null;
  return {
  slug: col.slug,
  name: col.name,
  curatedBy: col.curatedBy,
  description: col.description,
  coverImage,
  itemCount: colPicks.length,
  };
 })
 .filter((c) => c.itemCount > 0);

 return NextResponse.json({ collections });
 } catch {
 return NextResponse.json({ collections: [] });
 }
}
