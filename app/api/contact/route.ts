import { NextRequest, NextResponse } from "next/server";
import { createConversation } from "@/app/lib/messaging-db";

export const dynamic = "force-dynamic";

// Public: a storefront contact form / item question opens a conversation.
// { storeSlug, name?, email?, message, itemTitle? } → returns a thread token.
export async function POST(request: NextRequest) {
 const body = await request.json().catch(() => null);
 const storeSlug = body?.storeSlug ? String(body.storeSlug).trim() : "";
 const message = body?.message ? String(body.message).trim() : "";
 if (!storeSlug || !message) {
 return NextResponse.json({ error: "Message required." }, { status: 400 });
 }
 try {
 const { token } = await createConversation(storeSlug, {
 name: body?.name ? String(body.name).slice(0, 200) : null,
 email: body?.email ? String(body.email).slice(0, 200) : null,
 itemTitle: body?.itemTitle ? String(body.itemTitle).slice(0, 300) : null,
 message: message.slice(0, 5000),
 });
 return NextResponse.json({ ok: true, token });
 } catch {
 return NextResponse.json({ error: "Couldn’t send. Try again." }, { status: 500 });
 }
}
