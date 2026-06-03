import { NextResponse } from "next/server";
import { toggleLike } from "@/app/lib/communityDb";
import { getMobileUserId } from "@/app/lib/mobileAuth";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/community/posts/[id]/like
 * Body (optional): { deviceId?: string }
 * Authorization: Bearer <jwt> (preferred)
 *
 * Toggles a like. Returns { liked: boolean }.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
 const { id } = await ctx.params;
 const postId = parseInt(id, 10);
 if (!Number.isFinite(postId)) {
 return NextResponse.json({ error: "Invalid id" }, { status: 400 });
 }

 const userId = getMobileUserId(request);
 let liker: string;
 if (userId) {
 liker = userId;
 } else {
 const body = await request.json().catch(() => ({}));
 const deviceId = (body?.deviceId ?? "").toString().trim();
 if (!deviceId) {
 return NextResponse.json({ error: "deviceId required when not signed in" }, { status: 400 });
 }
 liker = `device:${deviceId}`;
 }

 try {
 const result = await toggleLike({ postId, liker });
 return NextResponse.json(result);
 } catch (err) {
 console.error("[community like] error:", err);
 return NextResponse.json({ error: "Internal error" }, { status: 500 });
 }
}
