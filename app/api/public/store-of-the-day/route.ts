import { NextResponse } from "next/server";
import { visibleStores } from "@/app/lib/stores";

export const dynamic = "force-dynamic";

/**
 * Returns a deterministic "store of the day" — same store for everyone
 * on a given day, rotates daily based on the UTC date.
 */
export async function GET() {
 const today = new Date();
 // YYYY-MM-DD as a simple seed
 const dayKey = `${today.getUTCFullYear()}${today.getUTCMonth()}${today.getUTCDate()}`;

 // Convert to a stable number from the string
 let seed = 0;
 for (let i = 0; i < dayKey.length; i++) {
 seed = (seed * 31 + dayKey.charCodeAt(i)) >>> 0;
 }
 const idx = seed % visibleStores.length;
 const s = visibleStores[idx];

 return NextResponse.json({
 store: {
  slug: s.slug,
  name: s.name,
  location: s.location ?? null,
  image: s.image ?? null,
  logo: s.logo ?? null,
  logoBg: (s as { logoBg?: string }).logoBg ?? "#ffffff",
  description: s.description ?? null,
  website: s.website ?? null,
 },
 });
}
