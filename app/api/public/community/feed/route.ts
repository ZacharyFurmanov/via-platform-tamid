import { NextResponse } from "next/server";
import { listPosts } from "@/app/lib/communityDb";
import { getMobileUserId } from "@/app/lib/mobileAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/community/feed?limit=30&cursor=123&deviceId=xxx
 * Bearer token (if present) is used as the viewer ID for liked_by_me;
 * else `deviceId` query param is used (so anonymous users still have stable
 * "did I like this" state).
 */
export async function GET(request: Request) {
 const { searchParams } = new URL(request.url);
 const limit = Math.min(parseInt(searchParams.get("limit") ?? "30"), 100);
 const cursorParam = searchParams.get("cursor");
 const cursor = cursorParam ? parseInt(cursorParam, 10) : null;
 const deviceId = (searchParams.get("deviceId") ?? "").trim();

 const userId = getMobileUserId(request);
 const viewerId = userId ?? (deviceId ? `device:${deviceId}` : "anon");

 try {
 const posts = await listPosts({
 viewerId,
 limit,
 cursor: Number.isFinite(cursor) ? cursor : null,
 });
 return NextResponse.json({ posts });
 } catch (err) {
 console.error("[community feed] error:", err);
 return NextResponse.json({ posts: [] });
 }
}
