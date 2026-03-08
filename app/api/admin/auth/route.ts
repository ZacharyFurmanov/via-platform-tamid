import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminSessionToken, ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS } from "@/app/lib/admin-session";
import { getFirebaseAdminAuth } from "@/app/lib/firebase-admin";

type DecodedTokenLike = {
  uid: string;
  email?: string;
  admin?: boolean;
  role?: string;
};

function getAdminEmailAllowlist(): string[] {
  return (process.env.FIREBASE_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function isFirebaseAdmin(decoded: DecodedTokenLike): boolean {
  if (decoded.admin === true || decoded.role === "admin") {
    return true;
  }

  const email = decoded.email?.toLowerCase();
  if (!email) return false;

  const allowlist = getAdminEmailAllowlist();
  return allowlist.includes(email);
}

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Firebase ID token is required" }, { status: 400 });
    }

    const firebaseAuth = getFirebaseAdminAuth();
    const decoded = (await firebaseAuth.verifyIdToken(idToken, true)) as DecodedTokenLike;

    if (!isFirebaseAdmin(decoded)) {
      return NextResponse.json({ error: "Admin access denied" }, { status: 403 });
    }

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(decoded.uid), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Auth] Firebase verification failed:", error);
    return NextResponse.json({ error: "Invalid Firebase session" }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  cookieStore.delete("via_admin_otp");
  return NextResponse.json({ success: true });
}
