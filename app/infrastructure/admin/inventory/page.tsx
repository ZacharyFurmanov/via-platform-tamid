"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Package } from "lucide-react";
import { Card, PageHeader, Badge, Button, ButtonLink, EmptyState, Input, Field } from "@/app/store/ui";

type Item = {
 id: string;
 title: string;
 priceCents: number;
 currency: string;
 images: string[];
 size: string | null;
 category: string | null;
 description: string | null;
 status: "draft" | "active" | "reserved" | "sold" | "removed";
 collections?: string[];
};

const TONE: Record<Item["status"], "neutral" | "success" | "warning" | "accent" | "critical"> = {
 draft: "neutral",
 active: "success",
 reserved: "warning",
 sold: "accent",
 removed: "critical",
};

type EditForm = { title: string; price: string; size: string; category: string; description: string };

export default function ItemsPage() {
 const pathname = usePathname();
 const statusFilter = pathname.endsWith("/drafts") ? "draft" : pathname.endsWith("/sold") ? "sold" : null;
 const [loading, setLoading] = useState(true);
 const [authErr, setAuthErr] = useState<string | null>(null);
 const [items, setItems] = useState<Item[]>([]);
 const [busyId, setBusyId] = useState<string | null>(null);
 const [isAdmin, setIsAdmin] = useState(false);
 const [selected, setSelected] = useState<Set<string>>(new Set());
 const [bulkBusy, setBulkBusy] = useState(false);
 const [editing, setEditing] = useState<Item | null>(null);
 const [editForm, setEditForm] = useState<EditForm>({ title: "", price: "", size: "", category: "", description: "" });
 const [savingEdit, setSavingEdit] = useState(false);
 // Collections: the store's collections + the ones selected for the item being edited.
 const [cols, setCols] = useState<{ id: string; title: string; itemCount?: number }[]>([]);
 const [selCols, setSelCols] = useState<string[]>([]);
 const [newCol, setNewCol] = useState("");

 async function load() {
 try {
 const r = await fetch("/api/store/items");
 if (!r.ok) {
 setAuthErr(r.status === 401 ? "Sign in as your store to manage items." : "Couldn’t load items.");
 setLoading(false);
 return;
 }
 const d = await r.json();
 setItems(d.items || []);
 setIsAdmin(!!d.isAdmin);
 } catch {
 setAuthErr("Couldn’t load items.");
 }
 setLoading(false);
 }
 useEffect(() => {
 (async () => { await load(); })();
 fetch("/api/store/collections").then((r) => (r.ok ? r.json() : null)).then((c) => c && setCols(c.collections || [])).catch(() => {});
 }, []);

 async function act(id: string, action: "sold" | "remove" | "publish") {
 if (action === "remove" && !confirm("Remove this item?")) return;
 setBusyId(id);
 await fetch(`/api/store/items/${id}`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ action }),
 });
 await load();
 setBusyId(null);
 }

 // ── Multi-select (for drops: stage drafts, then publish the batch at once) ──
 function toggle(id: string) {
 setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
 }
 function toggleAll() {
 setSelected((s) => (s.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
 }
 const selectedItems = items.filter((i) => selected.has(i.id));
 const draftsSelected = selectedItems.filter((i) => i.status === "draft").length;

 async function bulk(action: "publish" | "remove") {
 const ids = [...selected];
 if (!ids.length) return;
 if (action === "remove" && !confirm(`Remove ${ids.length} selected item${ids.length > 1 ? "s" : ""}?`)) return;
 setBulkBusy(true);
 await fetch("/api/store/items", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ action, ids }),
 }).catch(() => {});
 setSelected(new Set());
 await load();
 setBulkBusy(false);
 }

 // ── Edit a single item (any status, including drafts) ──
 function openEdit(it: Item) {
 setEditing(it);
 setEditForm({ title: it.title, price: (it.priceCents / 100).toFixed(0), size: it.size || "", category: it.category || "", description: it.description || "" });
 setSelCols(it.collections || []);
 setNewCol("");
 }
 async function saveEdit() {
 if (!editing) return;
 setSavingEdit(true);
 await fetch(`/api/store/items/${editing.id}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ title: editForm.title, price: Number(editForm.price) || 0, size: editForm.size, category: editForm.category, description: editForm.description, collections: selCols }),
 }).catch(() => {});
 setSavingEdit(false);
 setEditing(null);
 await load();
 }

 async function clearAll() {
 const n = items.length;
 if (!confirm(`OWNER RESET: permanently delete ALL ${n} items — including sold — plus their orders from this store? This can’t be undone.`)) return;
 setLoading(true);
 await fetch("/api/store/items", { method: "DELETE" }).catch(() => {});
 await load();
 }

 if (loading) return <div className="flex items-center justify-center py-32 text-sm text-stone-400">Loading…</div>;
 if (authErr) return <div className="flex items-center justify-center py-32 text-sm text-stone-500">{authErr}</div>;

 const counts = {
 active: items.filter((i) => i.status === "active").length,
 draft: items.filter((i) => i.status === "draft").length,
 sold: items.filter((i) => i.status === "sold").length,
 };
 // Sub-tab filter (Drafts / Sold) — from the route.
 const shown = statusFilter ? items.filter((i) => i.status === statusFilter) : items;
 const allChecked = items.length > 0 && selected.size === items.length;

 return (
 <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
 <PageHeader
 title="Inventory"
 subtitle={items.length ? `${counts.active} active · ${counts.draft} draft · ${counts.sold} sold` : "Your one-of-one pieces. Active items show on your storefront; sold ones delist instantly."}
 actions={
 <div className="flex items-center gap-3">
 {isAdmin && items.length > 0 && <button onClick={clearAll} className="text-[12px] text-red-600/80 hover:text-red-700 underline">Clear all (owner)</button>}
 <ButtonLink href="/infrastructure/admin/add-listing">+ New listing</ButtonLink>
 </div>
 }
 />

 {/* Bulk action bar — appears when items are selected (e.g. publish a whole drop). */}
 {selected.size > 0 && (
 <div className="mb-3 flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-[13px]">
 <span className="font-medium text-stone-700">{selected.size} selected</span>
 <div className="ml-auto flex items-center gap-2">
 <Button size="sm" disabled={bulkBusy || draftsSelected === 0} onClick={() => bulk("publish")}>
 {bulkBusy ? "Working…" : `Publish now${draftsSelected ? ` (${draftsSelected})` : ""}`}
 </Button>
 <Button size="sm" variant="secondary" disabled={bulkBusy} onClick={() => bulk("remove")}>Remove</Button>
 <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
 </div>
 </div>
 )}

 {items.length === 0 ? (
 <EmptyState
 icon={<Package size={28} strokeWidth={1.5} />}
 title="No items yet"
 body="Snap a photo and VYA drafts the listing for you — title, description, and a ghost-mannequin image."
 action={<ButtonLink href="/infrastructure/admin/add-listing">Snap your first piece</ButtonLink>}
 />
 ) : (
 <Card className="overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-[13px]">
 <thead>
 <tr className="border-b border-stone-100 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-stone-400">
 <th className="px-4 py-2.5 w-9"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-3.5 w-3.5 cursor-pointer accent-stone-800" aria-label="Select all" /></th>
 <th className="px-3 py-2.5 font-medium">Item</th>
 <th className="px-5 py-2.5 font-medium">Price</th>
 <th className="px-5 py-2.5 font-medium">Size</th>
 <th className="px-5 py-2.5 font-medium">Status</th>
 <th className="px-5 py-2.5 text-right font-medium">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-stone-100">
 {shown.map((it) => (
 <tr key={it.id} className={`transition hover:bg-stone-50 ${selected.has(it.id) ? "bg-stone-50" : ""}`}>
 <td className="px-4 py-3"><input type="checkbox" checked={selected.has(it.id)} onChange={() => toggle(it.id)} className="h-3.5 w-3.5 cursor-pointer accent-stone-800" aria-label={`Select ${it.title}`} /></td>
 <td className="px-3 py-3">
 <button onClick={() => openEdit(it)} className="flex items-center gap-3 text-left">
 <div className="h-11 w-9 shrink-0 overflow-hidden rounded bg-stone-100 ring-1 ring-stone-200">
 {it.images[0] && (
 // eslint-disable-next-line @next/next/no-img-element
 <img src={it.images[0]} alt="" className="h-full w-full object-cover" />
 )}
 </div>
 <span className="max-w-[240px] truncate font-medium text-stone-900 hover:underline">{it.title}</span>
 </button>
 </td>
 <td className="px-5 py-3 tabular-nums text-stone-600">${(it.priceCents / 100).toFixed(0)}</td>
 <td className="px-5 py-3 text-stone-500">{it.size || "—"}</td>
 <td className="px-5 py-3"><Badge tone={TONE[it.status]}>{it.status}</Badge></td>
 <td className="px-5 py-3">
 <div className="flex items-center justify-end gap-1.5">
 <Button size="sm" variant="ghost" disabled={busyId === it.id} onClick={() => openEdit(it)}>Edit</Button>
 {it.status === "draft" && <Button size="sm" variant="secondary" disabled={busyId === it.id} onClick={() => act(it.id, "publish")}>Publish</Button>}
 {(it.status === "active" || it.status === "reserved") && <Button size="sm" variant="secondary" disabled={busyId === it.id} onClick={() => act(it.id, "sold")}>Mark sold</Button>}
 {it.status !== "removed" && <Button size="sm" variant="ghost" disabled={busyId === it.id} onClick={() => act(it.id, "remove")}>Remove</Button>}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Card>
 )}

 {/* Edit modal */}
 {editing && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={() => setEditing(null)}>
 <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
 <div className="mb-4 flex items-center justify-between">
 <h2 className="text-base font-semibold text-stone-900">Edit listing</h2>
 <Badge tone={TONE[editing.status]}>{editing.status}</Badge>
 </div>
 <div className="space-y-3">
 <Field label="Title"><Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} /></Field>
 <div className="grid grid-cols-2 gap-3">
 <Field label="Price (USD)"><Input type="number" inputMode="numeric" value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} /></Field>
 <Field label="Size"><Input value={editForm.size} onChange={(e) => setEditForm((f) => ({ ...f, size: e.target.value }))} /></Field>
 </div>
 <Field label="Category"><Input value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} /></Field>
 <Field label="Description">
 <textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={4} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px] text-stone-900 outline-none focus:border-stone-400" />
 </Field>
 <div>
 <label className="mb-1.5 block text-[12px] font-medium text-stone-500">Collections <span className="font-normal text-stone-400">— where it shows on your store</span></label>
 <div className="flex flex-wrap gap-2">
 {cols.map((c) => {
 const on = selCols.includes(c.title);
 return (
 <button key={c.id} type="button" onClick={() => setSelCols((s) => (on ? s.filter((t) => t !== c.title) : [...s, c.title]))}
 className={`rounded-full border px-3 py-1.5 text-xs transition ${on ? "border-[#5D0F17] bg-[#5D0F17] text-white" : "border-stone-300 bg-white text-stone-600 hover:border-stone-400"}`}>
 {c.title}{c.itemCount ? ` ${c.itemCount}` : ""}
 </button>
 );
 })}
 {selCols.filter((t) => !cols.some((c) => c.title === t)).map((t) => (
 <button key={t} type="button" onClick={() => setSelCols((s) => s.filter((x) => x !== t))}
 className="rounded-full border border-[#5D0F17] bg-[#5D0F17] px-3 py-1.5 text-xs text-white">{t} ✕</button>
 ))}
 </div>
 <input value={newCol} onChange={(e) => setNewCol(e.target.value)}
 onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = newCol.trim(); if (t && !selCols.includes(t)) setSelCols((s) => [...s, t]); setNewCol(""); } }}
 placeholder="New collection — type &amp; Enter (Y2K, Designer bags…)"
 className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px] text-stone-900 outline-none focus:border-stone-400" />
 </div>
 </div>
 <div className="mt-5 flex items-center justify-end gap-2">
 <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
 <Button disabled={savingEdit || !editForm.title.trim()} onClick={saveEdit}>{savingEdit ? "Saving…" : "Save"}</Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
