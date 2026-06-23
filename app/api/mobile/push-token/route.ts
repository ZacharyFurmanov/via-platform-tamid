import { NextResponse } from "next/server";
import { getMobilePayload } from "@/app/lib/mobileAuth";
import { registerPushToken } from "@/app/lib/saved-searches-db";
import { storeSlugFromEmail } from "@/app/lib/storeAuth";
import { registerStorePushToken } from "@/app/lib/messages-db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
 const payload = getMobilePayload(request);
 if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 let body: { token?: string; platform?: string };
 try {
 body = await request.json();
 } catch {
 return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
 }

 const token = (body.token ?? "").trim();
 if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

 await registerPushToken(payload.sub, token, body.platform ?? null);

 // If this account is a store partner, also register the token for store
 // notifications so the in-app store dashboard gets banner pushes.
 const storeSlug = storeSlugFromEmail(payload.email);
 if (storeSlug) {
 await registerStorePushToken(storeSlug, token, body.platform ?? null);
 }

 return NextResponse.json({ ok: true });
}
