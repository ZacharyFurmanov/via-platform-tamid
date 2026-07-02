"use client";

import { useState } from "react";
import { Search } from "lucide-react";

// Header search — expands to an input, submits to the shop's ?q= filter.
export default function SearchBox({ handle, preview }: { handle: string; preview?: boolean }) {
 const [open, setOpen] = useState(false);
 const [q, setQ] = useState("");

 function go(e: React.FormEvent) {
 e.preventDefault();
 if (!q.trim()) return;
 window.location.href = `/s/${handle}/shop?q=${encodeURIComponent(q.trim())}${preview ? "&preview=1" : ""}`;
 }

 if (!open) {
 return (
 <button onClick={() => setOpen(true)} aria-label="Search" className="opacity-70 hover:opacity-100">
 <Search size={17} strokeWidth={1.5} />
 </button>
 );
 }
 return (
 <form onSubmit={go} className="flex items-center gap-1.5">
 <Search size={15} strokeWidth={1.5} className="opacity-50" />
 <input
 autoFocus
 value={q}
 onChange={(e) => setQ(e.target.value)}
 onBlur={() => !q && setOpen(false)}
 placeholder="Search…"
 className="w-28 border-b border-black/30 bg-transparent text-sm outline-none focus:border-black/60"
 />
 </form>
 );
}
