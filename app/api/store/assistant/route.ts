import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { runAssistant, isAssistantConfigured, type AssistantMessage } from "@/app/lib/assistant";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// VYA Sidekick endpoint. The client sends the running conversation; we run the
// tool-use loop scoped to the acting store and return the assistant's reply + a
// list of the actions it took (so the UI can refresh anything that changed).
export async function POST(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 if (!isAssistantConfigured()) return NextResponse.json({ error: "The assistant isn’t configured yet." }, { status: 503 });

 const body = await request.json().catch(() => null);
 const messages: AssistantMessage[] = Array.isArray(body?.messages) ? body.messages : [];
 if (!messages.length) return NextResponse.json({ error: "No messages." }, { status: 400 });

 try {
 const { reply, actions } = await runAssistant(slug, messages, { page: typeof body?.page === "string" ? body.page : undefined });
 return NextResponse.json({ reply, actions });
 } catch (e) {
 console.error("assistant error:", e);
 return NextResponse.json({ error: "The assistant hit an error — try again." }, { status: 500 });
 }
}
