import { NextResponse } from "next/server";
import { sendTrendingItemEmail } from "@/app/lib/email";

export async function GET() {
  await sendTrendingItemEmail(
    "hana@theviaplatform.com",
    "Vintage Galliano-Era Dior Saddle Bag",
    "https://theviaplatform.com/stores/rareality-archive.jpg",
    "Rareality Archive",
    "https://vyaplatform.com/products/rareality-archive-1",
    17,
    788,
    "USD",
  );
  return NextResponse.json({ ok: true, sent: "hana@theviaplatform.com" });
}
