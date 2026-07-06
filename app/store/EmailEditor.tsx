"use client";

import { useEffect, useId, useState } from "react";
import { Bold, Italic, Heading, List, Link2, Image as ImageIcon } from "lucide-react";
import { inputCls, cn } from "@/app/store/ui";

// A formatting editor + live in-browser preview for store emails (campaigns + automations).
// The preview renders through the SAME server renderer as the real send, so what a store sees
// here is exactly what lands in the inbox.
export default function EmailEditor({ body, onBody, subject, link, storeName, placeholder }: {
 body: string; onBody: (v: string) => void; subject: string; link: string; storeName?: string; placeholder?: string;
}) {
 const [previewHtml, setPreviewHtml] = useState("");
 const taId = useId();
 const getTa = () => document.getElementById(taId) as HTMLTextAreaElement | null;

 useEffect(() => {
 const id = setTimeout(() => {
 fetch("/api/store/email-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, link }) })
 .then((r) => (r.ok ? r.json() : null))
 .then((d) => { if (d?.html) setPreviewHtml(d.html); })
 .catch(() => {});
 }, 350);
 return () => clearTimeout(id);
 }, [body, link]);

 function surround(before: string, after = before) {
 const ta = getTa(); if (!ta) return;
 const { selectionStart: s, selectionEnd: e, value } = ta;
 onBody(value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e));
 requestAnimationFrame(() => { ta.focus(); ta.selectionStart = s + before.length; ta.selectionEnd = e + before.length; });
 }
 function prefixLine(prefix: string) {
 const ta = getTa(); if (!ta) return;
 const { selectionStart: s, value } = ta;
 const lineStart = value.lastIndexOf("\n", s - 1) + 1;
 onBody(value.slice(0, lineStart) + prefix + value.slice(lineStart));
 requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + prefix.length; });
 }
 function insert(text: string) {
 const ta = getTa(); if (!ta) return;
 const { selectionStart: s, selectionEnd: e, value } = ta;
 onBody(value.slice(0, s) + text + value.slice(e));
 requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + text.length; });
 }

 const tools: { icon: typeof Bold; label: string; run: () => void }[] = [
 { icon: Heading, label: "Heading", run: () => prefixLine("## ") },
 { icon: Bold, label: "Bold", run: () => surround("**") },
 { icon: Italic, label: "Italic", run: () => surround("*") },
 { icon: List, label: "Bullet list", run: () => prefixLine("- ") },
 { icon: Link2, label: "Link", run: () => surround("[", "](https://)") },
 { icon: ImageIcon, label: "Image", run: () => insert("![description](https://) ") },
 ];

 return (
 <div className="grid gap-4 md:grid-cols-2">
 <div>
 <div className="overflow-hidden rounded-lg border border-stone-200 focus-within:border-[#5D0F17]/40">
 <div className="flex items-center gap-0.5 border-b border-stone-100 bg-stone-50/70 px-1.5 py-1">
 {tools.map((t) => (
 <button key={t.label} type="button" title={t.label} onClick={t.run}
 className="flex h-7 w-7 items-center justify-center rounded-md text-stone-500 transition hover:bg-white hover:text-stone-900">
 <t.icon size={14} />
 </button>
 ))}
 </div>
 <textarea id={taId} value={body} onChange={(e) => onBody(e.target.value)}
 className={cn(inputCls, "h-56 rounded-none border-0 py-2.5 leading-relaxed focus:ring-0")}
 placeholder={placeholder || "Write your email…\n\n## A heading\nUse **bold**, *italic*, [links](https://…), and\n- bullet points"} />
 </div>
 <p className="mt-1 text-[11px] text-stone-400">
 <span className="font-mono">## heading</span> · <span className="font-mono">**bold**</span> · <span className="font-mono">*italic*</span> · <span className="font-mono">[text](url)</span> · <span className="font-mono">- list</span>
 </p>
 </div>

 <div>
 <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">Preview</p>
 <div className="overflow-hidden rounded-xl border border-stone-200/70 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
 <div className="border-b border-stone-100 px-4 py-2.5">
 <p className="truncate text-[13px] font-semibold text-stone-900">{subject || <span className="text-stone-400">Your subject line</span>}</p>
 <p className="mt-0.5 truncate text-[11px] text-stone-400">From {storeName || "your store"}</p>
 </div>
 <iframe srcDoc={previewHtml} title="Email preview" className="h-[420px] w-full border-0 bg-[#f6f5f2]" sandbox="" />
 </div>
 </div>
 </div>
 );
}
