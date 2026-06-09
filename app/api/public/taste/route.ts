import { NextResponse } from "next/server";
import { getMobileUserId } from "@/app/lib/mobileAuth";
import { getUserTaste, setUserTaste } from "@/app/lib/taste-db";
import { VIBES } from "@/app/lib/tasteVibes";

export const dynamic = "force-dynamic";

// GET /api/public/taste — the user's saved vibes + the available options.
// `taken` lets the app decide whether to show the taste-test card.
export async function GET(request: Request) {
 const options = VIBES.map((v) => ({ key: v.key, label: v.label }));
 const userId = getMobileUserId(request);
 if (!userId) return NextResponse.json({ vibes: [], taken: false, options });
 try {
 const vibes = await getUserTaste(userId);
 return NextResponse.json({ vibes, taken: vibes.length > 0, options });
 } catch {
 return NextResponse.json({ vibes: [], taken: false, options });
 }
}

// POST /api/public/taste — save the user's vibe selections. Body: { vibes: string[] }
export async function POST(request: Request) {
 const userId = getMobileUserId(request);
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 try {
 const body = await request.json().catch(() => ({}));
 const vibes = await setUserTaste(userId, body?.vibes);
 return NextResponse.json({ vibes, taken: vibes.length > 0 });
 } catch (err) {
 console.error("[taste] save error:", err);
 return NextResponse.json({ error: "Failed to save" }, { status: 500 });
 }
}
