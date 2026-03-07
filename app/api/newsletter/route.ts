import { NextRequest, NextResponse } from "next/server";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { getDb, nowIso } from "@/app/lib/firebase-db";

const GIVEAWAY_COLLECTION = "giveaway_entries";
const WAITLIST_COLLECTION = "waitlist";

type GiveawayRow = {
  email: string;
  created_at: string;
  referral_count?: number;
  reminder_sent_at?: string | null;
};

// GET - Return all giveaway entrants as the email list
export async function GET() {
  try {
    const snaps = await getDocs(collection(getDb(), GIVEAWAY_COLLECTION));

    const emails = snaps.docs
      .map((snap) => snap.data() as Partial<GiveawayRow>)
      .filter((row) => typeof row.email === "string" && typeof row.created_at === "string")
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((row) => ({
        email: row.email as string,
        signupDate: row.created_at as string,
        source: "giveaway",
        referralCount: Number(row.referral_count ?? 0),
        reminded: !!row.reminder_sent_at,
      }));

    return NextResponse.json({
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error("[Newsletter] Error fetching emails:", error);
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
  }
}

// POST - Add email (creates a waitlist entry)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const giveawaySnap = await getDoc(doc(collection(getDb(), GIVEAWAY_COLLECTION), normalizedEmail));
    if (giveawaySnap.exists()) {
      return NextResponse.json({ message: "You're already on the list!" }, { status: 200 });
    }

    const waitlistRef = doc(collection(getDb(), WAITLIST_COLLECTION), normalizedEmail);
    const existingWaitlist = await getDoc(waitlistRef);
    if (existingWaitlist.exists()) {
      return NextResponse.json({ message: "You're already on the list!" }, { status: 200 });
    }

    await setDoc(waitlistRef, {
      email: normalizedEmail,
      signup_date: nowIso(),
      source: "newsletter",
    });

    return NextResponse.json({ message: "Welcome to VIA! We'll keep you updated." }, { status: 201 });
  } catch (error) {
    console.error("[Newsletter] Error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
