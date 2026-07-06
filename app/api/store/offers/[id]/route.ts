import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { getOfferForStore, respondToOffer } from "@/app/lib/offers-db";
import { reserveItem } from "@/app/lib/db/inventory";
import { sendOfferUpdateToBuyer } from "@/app/lib/email";

export const dynamic = "force-dynamic";

// POST — the store responds to an offer. { action: "accept" | "decline" | "counter", amountCents? }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const { id } = await params;
 const offer = await getOfferForStore(Number(id), slug);
 if (!offer) return NextResponse.json({ error: "Offer not found." }, { status: 404 });

 const b = await request.json().catch(() => ({}));
 const action = String(b?.action || "");
 if (!["accept", "decline", "counter"].includes(action)) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
 const amountCents = action === "counter" ? Number(b?.amountCents) : undefined;
 if (action === "counter" && (!amountCents || amountCents <= 0)) return NextResponse.json({ error: "Enter a counter price." }, { status: 400 });

 const updated = await respondToOffer(offer, "store", action as "accept" | "decline" | "counter", amountCents);
 if (!updated) return NextResponse.json({ error: "That offer can’t be responded to anymore." }, { status: 409 });

 // Binding accept: hold the piece so it can't sell out from under the buyer while they pay.
 if (updated.status === "accepted" && updated.binding && updated.itemId) {
 await reserveItem(updated.itemId, `offer-${updated.token}`).catch(() => {});
 }
 // Let the buyer know it's their move (or that it's a deal / a pass).
 await sendOfferUpdateToBuyer(updated).catch(() => {});

 return NextResponse.json({ ok: true, offer: updated });
}
