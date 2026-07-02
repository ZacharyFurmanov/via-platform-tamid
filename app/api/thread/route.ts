import { NextRequest, NextResponse } from "next/server";
import { getConversationByToken, getMessages, addMessage } from "@/app/lib/messaging-db";

export const dynamic = "force-dynamic";

// Public buyer view of a conversation, by private token.
export async function GET(request: NextRequest) {
 const token = request.nextUrl.searchParams.get("token") || "";
 const conv = token ? await getConversationByToken(token).catch(() => null) : null;
 if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
 const messages = await getMessages(conv.id);
 return NextResponse.json({
 itemTitle: conv.itemTitle,
 status: conv.status,
 messages: messages.map((m) => ({ sender: m.sender, body: m.body, createdAt: m.createdAt })),
 });
}

// Buyer adds a message to their thread.
export async function POST(request: NextRequest) {
 const body = await request.json().catch(() => null);
 const token = body?.token ? String(body.token) : "";
 const text = body?.body ? String(body.body).trim() : "";
 if (!token || !text) return NextResponse.json({ error: "Message required." }, { status: 400 });
 const conv = await getConversationByToken(token).catch(() => null);
 if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
 await addMessage(conv.id, "buyer", text.slice(0, 5000));
 return NextResponse.json({ ok: true });
}
