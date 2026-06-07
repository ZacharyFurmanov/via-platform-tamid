import { NextResponse } from "next/server";
import { getMobileUserId } from "@/app/lib/mobileAuth";
import { registerPushToken } from "@/app/lib/saved-searches-db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
 const userId = getMobileUserId(request);
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 let body: { token?: string; platform?: string };
 try {
 body = await request.json();
 } catch {
 return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
 }

 const token = (body.token ?? "").trim();
 if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

 await registerPushToken(userId, token, body.platform ?? null);
 return NextResponse.json({ ok: true });
}
