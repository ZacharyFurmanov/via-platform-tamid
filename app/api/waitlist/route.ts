import { NextRequest, NextResponse } from "next/server";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { getDb, nowIso } from "@/app/lib/firebase-db";

const WAITLIST_COLLECTION = "waitlist";

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, source } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const ref = doc(collection(getDb(), WAITLIST_COLLECTION), normalizedEmail);
    const existing = await getDoc(ref);

    if (existing.exists()) {
      return NextResponse.json({ message: "You're already on the waitlist!" }, { status: 200 });
    }

    await setDoc(ref, {
      email: normalizedEmail,
      signup_date: nowIso(),
      source: source || "waitlist",
    });

    console.log(`[Waitlist] New signup: ${normalizedEmail}`);

    return NextResponse.json({ message: "You're on the list! We'll be in touch soon." }, { status: 201 });
  } catch (error) {
    console.error("[Waitlist] Error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const snaps = await getDocs(collection(getDb(), WAITLIST_COLLECTION));

    const emails = snaps.docs
      .map((snap) => snap.data() as { email?: string; signup_date?: string; source?: string })
      .filter((row) => typeof row.email === "string")
      .sort((a, b) => String(a.signup_date || "").localeCompare(String(b.signup_date || "")))
      .map((row) => ({
        email: row.email,
        signupDate: row.signup_date || nowIso(),
        source: row.source || "waitlist",
      }));

    return NextResponse.json({
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error("[Waitlist] Error fetching emails:", error);
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
  }
}
