import { NextResponse } from "next/server";
import {
 consumeMagicLinkToken,
 findOrCreateUserByEmail,
 signMobileJwt,
} from "@/app/lib/mobileAuth";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/auth/magic-link/verify
 * Body: { token: string }
 *
 * Validates the one-time token, finds/creates the user by email,
 * returns a 1-year session JWT.
 */
export async function POST(request: Request) {
 try {
 const body = await request.json();
 const token = (body?.token ?? "").toString().trim();
 if (!token) {
 return NextResponse.json({ error: "Missing token" }, { status: 400 });
 }

 const email = await consumeMagicLinkToken(token);
 if (!email) {
 return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
 }

 const userId = await findOrCreateUserByEmail(email);
 const jwt = signMobileJwt(userId, email);

 return NextResponse.json({ token: jwt, user: { id: userId, email } });
 } catch (err) {
 console.error("[mobile-magic-link verify] error:", err);
 return NextResponse.json({ error: "Internal error" }, { status: 500 });
 }
}
