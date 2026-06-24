import { NextResponse } from "next/server";
import { isApprovedRequest } from "@/app/lib/approval";
import { getMobileUserId } from "@/app/lib/mobileAuth";
import { getUserTasteProfile, setUserTasteProfile } from "@/app/lib/taste-db";
import { VIBES, TASTE_SIZE_GROUPS } from "@/app/lib/tasteVibes";

export const dynamic = "force-dynamic";

// GET /api/public/taste — the user's saved vibes + sizes, plus the available
// options. `taken` lets the app decide whether to show the taste-test card.
export async function GET(request: Request) {
 if (!(await isApprovedRequest(request))) return NextResponse.json({ error: "Approval required", needsApproval: true }, { status: 403 });
 const options = VIBES.map((v) => ({ key: v.key, label: v.label }));
 const sizeGroups = TASTE_SIZE_GROUPS;
 const userId = getMobileUserId(request);
 if (!userId) return NextResponse.json({ vibes: [], sizes: [], taken: false, options, sizeGroups });
 try {
 const { vibes, sizes } = await getUserTasteProfile(userId);
 return NextResponse.json({ vibes, sizes, taken: vibes.length > 0 || sizes.length > 0, options, sizeGroups });
 } catch {
 return NextResponse.json({ vibes: [], sizes: [], taken: false, options, sizeGroups });
 }
}

// POST /api/public/taste — save vibe + size selections. Body: { vibes: string[], sizes: string[] }
export async function POST(request: Request) {
 const userId = getMobileUserId(request);
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 try {
 const body = await request.json().catch(() => ({}));
 const { vibes, sizes } = await setUserTasteProfile(userId, { vibes: body?.vibes, sizes: body?.sizes });
 return NextResponse.json({ vibes, sizes, taken: vibes.length > 0 || sizes.length > 0 });
 } catch (err) {
 console.error("[taste] save error:", err);
 return NextResponse.json({ error: "Failed to save" }, { status: 500 });
 }
}
