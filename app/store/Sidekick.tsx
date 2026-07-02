"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, X, ArrowUp } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const PAGE_LABEL: Record<string, string> = {
 "/store/home": "Home", "/store/intake": "Add listing", "/store/items": "Inventory", "/store/orders": "Orders",
 "/store/inbox": "Inbox", "/store/storefront": "Storefront", "/store/customers": "Customers", "/store/payments": "Payments",
 "/store/dashboard": "Analytics", "/store/settings": "Settings",
 // The infrastructure workspace uses the same Sidekick with its own routes.
 "/infrastructure/admin/home": "Home", "/infrastructure/admin/add-listing": "Add listing", "/infrastructure/admin/inventory": "Inventory",
 "/infrastructure/admin/orders": "Orders", "/infrastructure/admin/inbox": "Inbox", "/infrastructure/admin/storefront": "Storefront",
 "/infrastructure/admin/customers": "Customers", "/infrastructure/admin/payments": "Payments", "/infrastructure/admin/dashboard": "Analytics",
 "/infrastructure/admin/settings": "Settings", "/infrastructure/admin/marketing": "Marketing", "/infrastructure/admin/performance": "Performance",
 "/infrastructure/admin/connect": "Connect", "/infrastructure/admin/import": "Bring your site", "/infrastructure/admin/ai": "AI accuracy",
};

// Writes that change something visible — tell the page to refresh after.
const WRITE_TOOLS = new Set(["update_storefront_design", "set_hero_photo", "update_listing", "add_section", "update_section", "remove_section", "move_section", "set_layout", "create_page", "set_page_layout", "delete_page", "edit_captured_page", "style_captured_site"]);

export default function Sidekick() {
 const pathname = usePathname();
 const [open, setOpen] = useState(false);
 const [msgs, setMsgs] = useState<Msg[]>([]);
 const [input, setInput] = useState("");
 const [busy, setBusy] = useState(false);
 const scroller = useRef<HTMLDivElement>(null);
 // Refs so the (once-registered) "vya:ask" listener always sees current state.
 const msgsRef = useRef<Msg[]>([]);
 const busyRef = useRef(false);
 const pathRef = useRef(pathname);
 useEffect(() => { pathRef.current = pathname; }, [pathname]);

 useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [msgs, busy]);

 async function send(textArg?: string) {
 const text = (textArg ?? input).trim();
 if (!text || busyRef.current) return;
 const next = [...msgsRef.current, { role: "user" as const, content: text }];
 msgsRef.current = next; setMsgs(next); setInput(""); busyRef.current = true; setBusy(true);
 try {
 const page = PAGE_LABEL[pathRef.current] || undefined;
 const r = await fetch("/api/store/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, page }) });
 const d = await r.json();
 const reply = !r.ok ? (d.error || "Something went wrong.") : (d.reply || "(done)");
 const after = [...msgsRef.current, { role: "assistant" as const, content: reply }];
 msgsRef.current = after; setMsgs(after);
 if (r.ok && (d.actions || []).some((a: { name: string; ok: boolean }) => a.ok && WRITE_TOOLS.has(a.name))) {
 window.dispatchEvent(new Event("vya:store-updated"));
 }
 } catch {
 const after = [...msgsRef.current, { role: "assistant" as const, content: "Couldn’t reach me just now — try again." }];
 msgsRef.current = after; setMsgs(after);
 }
 busyRef.current = false; setBusy(false);
 }

 // The home-page hero bar (and anything else) can open VYA with a question.
 useEffect(() => {
 function onAsk(e: Event) {
 const detail = (e as CustomEvent).detail;
 setOpen(true);
 if (typeof detail === "string" && detail.trim()) send(detail);
 }
 window.addEventListener("vya:ask", onAsk as EventListener);
 return () => window.removeEventListener("vya:ask", onAsk as EventListener);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 return (
 <>
 {/* Launcher */}
 {!open && (
 <button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#5D0F17] px-4 py-3 text-[#FFFDF8] shadow-lg hover:bg-[#5D0F17]/90 transition">
 <Sparkles size={16} />
 <span className="text-xs uppercase tracking-[0.15em]">VYA</span>
 </button>
 )}

 {/* Panel */}
 {open && (
 <div className="fixed bottom-5 right-5 z-50 flex h-[560px] max-h-[80vh] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col rounded-2xl border border-black/10 bg-[#FFFDF8] shadow-[0_24px_70px_-20px_rgba(0,0,0,0.45)]">
 <div className="flex items-center justify-between border-b border-black/[0.07] px-4 py-3">
 <div className="flex items-center gap-2 text-[#5D0F17]"><Sparkles size={15} /><span className="font-serif text-sm">VYA</span></div>
 <button onClick={() => setOpen(false)} className="text-[#5D0F17]/45 hover:text-[#5D0F17]"><X size={17} /></button>
 </div>

 <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
 {msgs.length === 0 && (
 <div className="text-[#5D0F17]/55 text-sm">
 <p className="mb-3">Hi — I can help you run and customize your store. Try:</p>
 <div className="space-y-1.5">
 {["Build my whole storefront for me", "Make my storefront more elegant", "Add a sale announcement bar", "Write a description for my Chanel bag"].map((s) => (
 <button key={s} onClick={() => send(s)} className="block w-full text-left text-[13px] border border-[#5D0F17]/12 bg-white px-3 py-2 hover:border-[#5D0F17]/30 transition">{s}</button>
 ))}
 </div>
 </div>
 )}
 {msgs.map((m, i) => (
 <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
 <div className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-[#5D0F17] text-[#FFFDF8] rounded-2xl rounded-br-sm" : "bg-[#5D0F17]/[0.06] text-[#2c241d] rounded-2xl rounded-bl-sm"}`}>{m.content}</div>
 </div>
 ))}
 {busy && <div className="flex justify-start"><div className="bg-[#5D0F17]/[0.06] text-[#5D0F17]/50 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[13px]">…</div></div>}
 </div>

 <div className="border-t border-black/[0.07] p-3">
 <div className="flex items-end gap-2 rounded-xl border border-[#5D0F17]/15 bg-white px-3 py-2">
 <textarea
 value={input}
 onChange={(e) => setInput(e.target.value)}
 onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
 placeholder="Ask or tell me to do something…"
 rows={1}
 className="flex-1 resize-none bg-transparent text-sm text-[#2c241d] outline-none max-h-24"
 />
 <button onClick={() => send()} disabled={busy || !input.trim()} className="shrink-0 rounded-full bg-[#5D0F17] p-1.5 text-[#FFFDF8] disabled:opacity-40"><ArrowUp size={15} /></button>
 </div>
 <p className="mt-1.5 text-center text-[10px] text-[#5D0F17]/35">VYA confirms before changing anything.</p>
 </div>
 </div>
 )}
 </>
 );
}
