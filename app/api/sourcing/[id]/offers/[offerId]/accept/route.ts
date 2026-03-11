import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getSourcingRequestById, claimSourcingRequest } from "@/app/lib/sourcing-db";
import { acceptSourcingOffer } from "@/app/lib/sourcing-offers-db";
import { sendSourcingOfferAcceptedToStore } from "@/app/lib/email";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: requestId, offerId } = await params;

  // Verify the request belongs to this user and is still open
  const req = await getSourcingRequestById(requestId, session.user.id);
  if (!req) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (req.status !== "paid") {
    return NextResponse.json({ error: "This request is no longer accepting offers" }, { status: 409 });
  }

  // Accept this offer (and decline all others)
  const acceptedOffer = await acceptSourcingOffer(offerId, requestId);
  if (!acceptedOffer) {
    return NextResponse.json({ error: "Offer not found or already actioned" }, { status: 409 });
  }

  // Mark the sourcing request as matched to this store
  await claimSourcingRequest(requestId, acceptedOffer.storeSlug);

  // Email the store
  await sendSourcingOfferAcceptedToStore({
    storeEmail: acceptedOffer.storeEmail,
    storeName: acceptedOffer.storeName,
    customerName: req.userName,
    customerEmail: req.userEmail,
    requestDescription: req.description,
    fee: acceptedOffer.fee,
    timeline: acceptedOffer.timeline,
  });

  return NextResponse.json({ success: true });
}
