import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { runAssistant, isAssistantConfigured, type AssistantMessage } from "@/app/lib/assistant";
import { loadThread, saveThread, clearThread, type ThreadMessage } from "@/app/lib/assistant-memory-db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET — load the saved conversation so the chat survives refreshes/sessions.
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 return NextResponse.json({ messages: await loadThread(slug) });
}

// DELETE — start a fresh chat (clears the saved thread; long-term memory is kept).
export async function DELETE(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 await clearThread(slug);
 return NextResponse.json({ ok: true });
}

// VYA Sidekick endpoint. The client sends the running conversation; we run the
// tool-use loop scoped to the acting store and return the assistant's reply + a
// list of the actions it took (so the UI can refresh anything that changed). The
// visible thread is persisted so it's there next time.
export async function POST(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 if (!isAssistantConfigured()) return NextResponse.json({ error: "The assistant isn’t configured yet." }, { status: 503 });

 const body = await request.json().catch(() => null);
 const messages: AssistantMessage[] = Array.isArray(body?.messages) ? body.messages : [];
 if (!messages.length) return NextResponse.json({ error: "No messages." }, { status: 400 });

 try {
 const { reply, actions } = await runAssistant(slug, messages, { page: typeof body?.page === "string" ? body.page : undefined });
 // Persist the visible thread (plain text turns only — not the tool-call internals).
 const thread: ThreadMessage[] = [...messages, { role: "assistant", content: reply }]
 .filter((m) => typeof m.content === "string")
 .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content) }));
 await saveThread(slug, thread);
 return NextResponse.json({ reply, actions });
 } catch (e) {
 console.error("assistant error:", e);
 return NextResponse.json({ error: "The assistant hit an error — try again." }, { status: 500 });
 }
}
