import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { clearEbayTokensByUser } from "@/app/lib/ebay-tokens-db";

export const dynamic = "force-dynamic";

// eBay Marketplace Account Deletion / Closure notification endpoint — required to enable
// a Production keyset. GET = eBay's one-time validation challenge; POST = a real deletion
// notice (we drop that user's stored eBay data and ack 200).

function endpointUrl(req: NextRequest): string {
 return process.env.EBAY_DELETION_ENDPOINT || `${req.nextUrl.origin}${req.nextUrl.pathname}`;
}

// Validation: echo SHA-256(challengeCode + verificationToken + endpoint) as hex.
export async function GET(req: NextRequest) {
 const challengeCode = req.nextUrl.searchParams.get("challenge_code");
 const token = process.env.EBAY_VERIFICATION_TOKEN;
 if (!token) return NextResponse.json({ error: "EBAY_VERIFICATION_TOKEN not set" }, { status: 500 });
 if (!challengeCode) return NextResponse.json({ error: "challenge_code required" }, { status: 400 });
 const challengeResponse = createHash("sha256").update(challengeCode + token + endpointUrl(req)).digest("hex");
 return NextResponse.json({ challengeResponse }, { status: 200 });
}

// Real notification: acknowledge fast, best-effort delete the user's eBay data.
export async function POST(req: NextRequest) {
 const body = await req.json().catch(() => null);
 const username = body?.notification?.data?.username;
 if (username) clearEbayTokensByUser(String(username)).catch(() => {});
 return new NextResponse(null, { status: 200 });
}
