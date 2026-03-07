import { NextResponse } from "next/server";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { getDb, nowIso } from "@/app/lib/firebase-db";

const WAITLIST_COLLECTION = "waitlist";

type WaitlistSeedData = {
  emails: Array<{
    email: string;
    signupDate?: string;
    source?: string;
  }>;
};

export async function POST() {
  try {
    const dataFile = path.join(process.cwd(), "app", "data", "waitlist.json");
    const content = fs.readFileSync(dataFile, "utf-8");
    const data = JSON.parse(content) as WaitlistSeedData;

    let inserted = 0;
    let skipped = 0;

    for (const entry of data.emails) {
      if (!entry.email) {
        skipped += 1;
        continue;
      }

      const normalizedEmail = entry.email.toLowerCase();
      const ref = doc(collection(getDb(), WAITLIST_COLLECTION), normalizedEmail);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        skipped += 1;
        continue;
      }

      await setDoc(ref, {
        email: normalizedEmail,
        signup_date: entry.signupDate || nowIso(),
        source: entry.source || "waitlist",
      });
      inserted += 1;
    }

    return NextResponse.json({
      message: `Seeded ${inserted} emails (${skipped} skipped)`,
      total: data.emails.length,
    });
  } catch (error) {
    console.error("[Waitlist Seed] Error:", error);
    return NextResponse.json({ error: "Seed failed", details: String(error) }, { status: 500 });
  }
}
