"use client";

import { useEffect, useState } from "react";
import Blocks from "@/app/s/Blocks";
import { makeBlock, pageSlugify, type Block, type BlockDef, type BlockType, type StorePage } from "@/app/lib/storefront-blocks";

type Template = { id: string; name: string; description: string; colors: { bg: string; text: string; accent: string }; fonts: { heading: string; body: string }; heroStyle: string };
type Colors = { bg: string; text: string; accent: string };
type Fonts = { heading: string; body: string };
type Product = { title: string; price: number | null; currency: string; image: string };
type DnsRecord = { type: string; name: string; value: string };
type DomainStatus = { domain: string; verified: boolean; misconfigured: boolean; records: DnsRecord[]; verification: { type: string; domain: string; value: string }[] };

const SERIFS = new Set(["Playfair Display", "Bodoni Moda", "Cormorant Garamond", "Newsreader", "Instrument Serif", "Fraunces"]);
const ff = (name: string) => `'${name}', ${SERIFS.has(name) ? "Georgia, serif" : "system-ui, sans-serif"}`;
const money = (c: number | null, cur: string) => (c == null ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD", maximumFractionDigits: 0 }).format(c / 100));

export default function StorefrontEditor() {
 const [loading, setLoading] = useState(true);
 const [tab, setTab] = useState<"design" | "sections" | "assets" | "details" | "domain">("sections");
 const [storeName, setStoreName] = useState("Your Store");

 // Design
 const [templates, setTemplates] = useState<Template[]>([]);
 const [headingFonts, setHeadingFonts] = useState<string[]>([]);
 const [bodyFonts, setBodyFonts] = useState<string[]>([]);
 const [template, setTemplate] = useState<string | null>(null);
 const [colors, setColors] = useState<Colors>({ bg: "#FFFDF8", text: "#1a1a1a", accent: "#5D0F17" });
 const [fonts, setFonts] = useState<Fonts>({ heading: "Playfair Display", body: "Inter" });
 const [products, setProducts] = useState<Product[]>([]);
 const [blocks, setBlocks] = useState<Block[]>([]);
 const [extraPages, setExtraPages] = useState<StorePage[]>([]);
 const [activeSlug, setActiveSlug] = useState("home"); // which page the Sections tab edits
 const [blockTypes, setBlockTypes] = useState<BlockDef[]>([]);
 const [dragIdx, setDragIdx] = useState<number | null>(null);

 // Details
 const [handle, setHandle] = useState("");
 const [enabled, setEnabled] = useState(false);
 const [tagline, setTagline] = useState("");
 const [heroImage, setHeroImage] = useState("");
 const [about, setAbout] = useState("");

 // Domain
 const [dom, setDom] = useState<{ configured: boolean; domain: string | null; status: DomainStatus | null }>({ configured: false, domain: null, status: null });
 const [domInput, setDomInput] = useState("");
 const [domBusy, setDomBusy] = useState(false);
 const [domErr, setDomErr] = useState<string | null>(null);
 // Buy a domain through VYA (Vercel registrar)
 const [dsearch, setDsearch] = useState("");
 const [dres, setDres] = useState<{ domain: string; available: boolean; priceCents: number | null } | null>(null);
 const [dsBusy, setDsBusy] = useState(false);
 const [showBuy, setShowBuy] = useState(false);
 const [buyForm, setBuyForm] = useState({ firstName: "", lastName: "", email: "", phone: "", address1: "", city: "", state: "", zip: "", country: "US" });
 const [buyBusy, setBuyBusy] = useState(false);
 const [buyMsg, setBuyMsg] = useState<string | null>(null);

 // Media library
 const [assets, setAssets] = useState<{ url: string }[]>([]);
 const [assetBusy, setAssetBusy] = useState(false);
 const [dragHero, setDragHero] = useState(false);

 const [busy, setBusy] = useState(false);
 const [saved, setSaved] = useState(false);
 const [err, setErr] = useState<string | null>(null);

 // Captured site (a seller who brought their own site over): they edit THAT, not blocks.
 const [captured, setCaptured] = useState<{ count: number; url: string | null; origin: string | null; pages: string[] } | null>(null);
 const [isAdmin, setIsAdmin] = useState(false); // owner-only: the reset/wipe action
 const [selPath, setSelPath] = useState("/");
 const [syncBusy, setSyncBusy] = useState(false);
 const [syncMsg, setSyncMsg] = useState<string | null>(null);
 const [previewKey, setPreviewKey] = useState(0); // bump to reload the preview iframe
 const [genBusy, setGenBusy] = useState(false); // "build my storefront with VYA"
 const [genErr, setGenErr] = useState<string | null>(null);

 useEffect(() => {
 let cancelled = false;
 (async () => {
 try {
 const [meR, sfR, dsR, domR, asR, capR] = await Promise.all([
 fetch("/api/store/me"),
 fetch("/api/store/storefront"),
 fetch("/api/store/storefront/design"),
 fetch("/api/store/domain"),
 fetch("/api/store/assets"),
 fetch("/api/store/capture"),
 ]);
 if (cancelled) return;
 if (capR.ok) { const c = await capR.json(); setIsAdmin(!!c.isAdmin); if (c.captured > 0) setCaptured({ count: c.captured, url: c.url, origin: c.origin, pages: c.pages || [] }); }
 if (asR.ok) { const a = await asR.json(); setAssets(a.assets || []); }
 if (meR.ok) { const m = await meR.json(); setStoreName(m.storeName || "Your Store"); }
 if (sfR.ok) {
 const d = await sfR.json();
 setHandle(d.settings.handle || ""); setEnabled(!!d.settings.enabled);
 setTagline(d.settings.tagline || ""); setHeroImage(d.settings.heroImage || ""); setAbout(d.settings.about || "");
 }
 if (dsR.ok) {
 const d = await dsR.json();
 setTemplates(d.templates || []); setHeadingFonts(d.headingFonts || []); setBodyFonts(d.bodyFonts || []);
 setTemplate(d.template); setColors(d.colors); setFonts(d.fonts); setProducts(d.products || []);
 setBlocks(d.blocks || []); setExtraPages(d.extraPages || []); setBlockTypes(d.blockTypes || []);
 const fams = [...new Set([...(d.headingFonts || []), ...(d.bodyFonts || [])])].map((f: string) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700`).join("&");
 const link = document.createElement("link"); link.rel = "stylesheet"; link.href = `https://fonts.googleapis.com/css2?${fams}&display=swap`; document.head.appendChild(link);
 }
 if (domR.ok) { const d = await domR.json(); setDom({ configured: !!d.configured, domain: d.domain || null, status: d.status || null }); }
 } catch { /* leave defaults */ }
 if (!cancelled) setLoading(false);
 })();
 return () => { cancelled = true; };
 }, []);

 // The Sidekick can change the design — refresh the editor + preview when it does.
 useEffect(() => {
 function onUpdate() {
 setPreviewKey((k) => k + 1); // reload the captured-site preview after a VYA edit
 (async () => {
 try {
 const [sfR, dsR] = await Promise.all([fetch("/api/store/storefront"), fetch("/api/store/storefront/design")]);
 if (sfR.ok) { const d = await sfR.json(); setTagline(d.settings.tagline || ""); setHeroImage(d.settings.heroImage || ""); }
 if (dsR.ok) { const d = await dsR.json(); setTemplate(d.template); setColors(d.colors); setFonts(d.fonts); setBlocks(d.blocks || []); setExtraPages(d.extraPages || []); }
 } catch { /* ignore */ }
 })();
 }
 window.addEventListener("vya:store-updated", onUpdate);
 return () => window.removeEventListener("vya:store-updated", onUpdate);
 }, []);

 function applyTemplate(t: Template) { setTemplate(t.id); setColors({ ...t.colors }); setFonts({ ...t.fonts }); setSaved(false); }

 // Build-from-scratch sellers: VYA designs a full storefront from their products.
 async function generateStorefront() {
 setGenBusy(true); setGenErr(null);
 try {
 const r = await fetch("/api/store/storefront/generate", { method: "POST" });
 const d = await r.json();
 if (!r.ok) { setGenErr(d.error || "Couldn’t generate — try again."); setGenBusy(false); return; }
 const dsR = await fetch("/api/store/storefront/design");
 if (dsR.ok) { const ds = await dsR.json(); setTemplate(ds.template); setColors(ds.colors); setFonts(ds.fonts); setBlocks(ds.blocks || []); setExtraPages(ds.extraPages || []); setActiveSlug("home"); }
 setSaved(false);
 } catch { setGenErr("Couldn’t generate — try again."); }
 setGenBusy(false);
 }

 // Re-pull the seller's live site so the hosted copy reflects their latest changes.
 async function reSync() {
 if (!captured?.origin) { setSyncMsg("We don't have your original site URL — bring it over again from “Bring your site.”"); return; }
 setSyncBusy(true); setSyncMsg(null);
 try {
 const r = await fetch("/api/store/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: captured.origin }) });
 const d = await r.json();
 if (!r.ok) setSyncMsg(d.error || "Re-sync failed.");
 else { setCaptured((c) => (c ? { ...c, count: d.pages ?? c.count } : c)); setSyncMsg(`✓ Synced — ${d.pages} pages now up to date.`); setPreviewKey((k) => k + 1); }
 } catch { setSyncMsg("Re-sync failed."); }
 setSyncBusy(false);
 }

 // The sections being edited belong to the active page (home or an extra page).
 const curBlocks = activeSlug === "home" ? blocks : extraPages.find((p) => p.slug === activeSlug)?.blocks ?? [];
 function updateCur(fn: (bs: Block[]) => Block[]) {
 if (activeSlug === "home") setBlocks(fn);
 else setExtraPages((ps) => ps.map((p) => (p.slug === activeSlug ? { ...p, blocks: fn(p.blocks) } : p)));
 setSaved(false);
 }
 function addBlock(type: BlockType) { updateCur((bs) => [...bs, makeBlock(type)]); }
 function removeBlock(id: string) { updateCur((bs) => bs.filter((b) => b.id !== id)); }
 function moveBlock(i: number, dir: -1 | 1) { updateCur((bs) => { const to = i + dir; if (to < 0 || to >= bs.length) return bs; const next = [...bs]; [next[i], next[to]] = [next[to], next[i]]; return next; }); }
 function setBlockProp(id: string, key: string, val: string) { updateCur((bs) => bs.map((b) => (b.id === id ? { ...b, props: { ...b.props, [key]: val } } : b))); }
 function setBlockBg(id: string, bg: string) { updateCur((bs) => bs.map((b) => (b.id === id ? { ...b, style: bg ? { bg } : undefined } : b))); }
 function reorderTo(to: number) { if (dragIdx === null || dragIdx === to) { setDragIdx(null); return; } const from = dragIdx; updateCur((bs) => { const next = [...bs]; const [m] = next.splice(from, 1); next.splice(to, 0, m); return next; }); setDragIdx(null); }

 function addPage() {
 const title = window.prompt("Page name (e.g. About, FAQ, Shipping)");
 if (!title || !title.trim()) return;
 let slug = pageSlugify(title);
 const taken = new Set(["home", "shop", ...extraPages.map((p) => p.slug)]);
 if (taken.has(slug)) slug = `${slug}-${extraPages.length + 1}`;
 setExtraPages((ps) => [...ps, { slug, title: title.trim().slice(0, 60), blocks: [] }]);
 setActiveSlug(slug); setSaved(false);
 }
 function deletePage(slug: string) {
 if (!window.confirm("Delete this page?")) return;
 setExtraPages((ps) => ps.filter((p) => p.slug !== slug));
 if (activeSlug === slug) setActiveSlug("home");
 setSaved(false);
 }
 async function saveBlocks() {
 setBusy(true); setSaved(false); setErr(null);
 try { const r = await fetch("/api/store/storefront/design", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ blocks, extraPages }) }); if (!r.ok) setErr("Couldn’t save."); else setSaved(true); } catch { setErr("Couldn’t save."); }
 setBusy(false);
 }

 async function saveDesign() {
 setBusy(true); setSaved(false); setErr(null);
 try {
 const r = await fetch("/api/store/storefront/design", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template, colors, fonts }) });
 if (!r.ok) setErr("Couldn’t save the design."); else setSaved(true);
 } catch { setErr("Couldn’t save the design."); }
 setBusy(false);
 }

 async function saveDetails() {
 setBusy(true); setSaved(false); setErr(null);
 try {
 const r = await fetch("/api/store/storefront", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle, enabled, tagline, accentColor: colors.accent, heroImage, about }) });
 const d = await r.json();
 if (!r.ok) setErr(d.error || "Save failed."); else { setHandle(d.settings.handle); setSaved(true); }
 } catch { setErr("Save failed."); }
 setBusy(false);
 }

 async function connectDomain() {
 setDomBusy(true); setDomErr(null);
 try {
 const r = await fetch("/api/store/domain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: domInput }) });
 const d = await r.json();
 if (!r.ok) setDomErr(d.error || "Couldn’t connect that domain."); else { setDom({ configured: true, domain: d.domain, status: d.status }); setDomInput(""); }
 } catch { setDomErr("Couldn’t connect that domain."); }
 setDomBusy(false);
 }
 async function recheckDomain() {
 setDomBusy(true); setDomErr(null);
 try { const r = await fetch("/api/store/domain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify" }) }); const d = await r.json(); if (r.ok) setDom((x) => ({ ...x, status: d.status })); else setDomErr(d.error || "Check failed."); } catch { setDomErr("Check failed."); }
 setDomBusy(false);
 }
 async function disconnectDomain() { if (!confirm("Disconnect this domain?")) return; setDomBusy(true); await fetch("/api/store/domain", { method: "DELETE" }); setDom((x) => ({ ...x, domain: null, status: null })); setDomBusy(false); }
 async function searchDomain() {
 const q = dsearch.trim(); if (!q) return;
 setDsBusy(true); setDres(null); setShowBuy(false); setBuyMsg(null);
 try { const r = await fetch("/api/store/domain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "search", domain: q }) }); const d = await r.json(); if (r.ok) setDres({ domain: d.domain, available: d.available, priceCents: d.priceCents }); else setBuyMsg(d.error || "Search failed."); } catch { setBuyMsg("Search failed."); }
 setDsBusy(false);
 }
 async function buyDomainNow() {
 if (!dres) return;
 setBuyBusy(true); setBuyMsg(null);
 try { const r = await fetch("/api/store/domain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "buy", domain: dres.domain, contact: buyForm }) }); const d = await r.json(); if (r.ok) { setDom((x) => ({ ...x, domain: d.domain, status: d.status })); setDres(null); setShowBuy(false); } else setBuyMsg(d.error || "Purchase failed."); } catch { setBuyMsg("Purchase failed."); }
 setBuyBusy(false);
 }

 async function uploadAssets(files: FileList | File[]) {
 const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
 if (!imgs.length) return;
 setAssetBusy(true);
 for (const f of imgs) {
 const fd = new FormData(); fd.append("file", f);
 try { const r = await fetch("/api/store/assets", { method: "POST", body: fd }); if (r.ok) { const d = await r.json(); setAssets((a) => [{ url: d.url }, ...a]); } } catch { /* skip */ }
 }
 setAssetBusy(false);
 }
 async function deleteAsset(url: string) {
 setAssets((a) => a.filter((x) => x.url !== url));
 await fetch(`/api/store/assets?url=${encodeURIComponent(url)}`, { method: "DELETE" }).catch(() => {});
 }
 // Place a photo as the hero and persist it immediately (drag-drop or click).
 async function setHero(url: string) {
 setHeroImage(url);
 await fetch("/api/store/storefront", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle, enabled, tagline, accentColor: colors.accent, heroImage: url, about }) }).catch(() => {});
 }

 const input = "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-[13px] text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-900/[0.06]";
 const label = "block text-[12px] font-medium text-stone-500 mb-2";
 const ink = "#5D0F17";

 if (loading) return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400 text-sm">Loading…</div>;

 // A seller who brought their own site over edits THAT site (live preview + re-sync
 // + conversational edits via VYA), not the block builder.
 if (captured) {
 const pageLabel = (p: string) => {
 if (p === "/") return "Home";
 const seg = p.split("/").filter(Boolean).pop() || p;
 return seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
 };
 const editSrc = `${captured.url || ""}${selPath === "/" ? "" : selPath}?edit=1`;
 return (
 <main className="min-h-screen bg-stone-50 text-stone-900">
 <div className="px-6 py-5 border-b border-stone-200 bg-white flex items-start justify-between gap-4">
 <div>
 <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400 mb-1">Storefront · your site</p>
 <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Edit your pages</h1>
 <p className="mt-0.5 text-xs text-stone-500">Click any text on the page to edit it, then Save. Or ask VYA for bigger changes.</p>
 </div>
 <div className="flex flex-col items-end gap-2 shrink-0">
 {captured.url && <a href={captured.url} target="_blank" rel="noopener noreferrer" className="bg-[#5D0F17] text-white px-4 py-2 text-[13px] font-medium hover:bg-[#5D0F17]/85 whitespace-nowrap">View live ↗</a>}
 <button onClick={reSync} disabled={syncBusy} className="border border-stone-300 px-4 py-2 text-[13px] font-medium hover:border-[#5D0F17] disabled:opacity-50 whitespace-nowrap">{syncBusy ? "Syncing…" : "Re-sync from live site"}</button>
 </div>
 </div>
 {(syncBusy || syncMsg) && <div className="px-6 py-2 bg-white border-b border-stone-200 text-xs">{syncBusy ? <span className="text-stone-400">Re-crawling your live site — a minute or two…</span> : <span className={syncMsg!.startsWith("✓") ? "text-green-700" : "text-amber-700"}>{syncMsg}</span>}</div>}
 <div className="flex flex-col lg:flex-row">
 {/* Page list */}
 <div className="lg:w-64 lg:shrink-0 border-r border-stone-200 bg-white lg:h-[calc(100vh-150px)] lg:overflow-y-auto">
 <p className="px-4 pt-4 pb-2 text-[10px] uppercase tracking-[0.18em] text-stone-400">Pages ({captured.pages.length})</p>
 {captured.pages.map((p) => (
 <button key={p} onClick={() => { setSelPath(p); setPreviewKey((k) => k + 1); }} className={`block w-full text-left px-4 py-2 border-l-2 ${selPath === p ? "border-[#5D0F17] bg-stone-50" : "border-transparent hover:bg-[#5D0F17]/[0.02]"}`}>
 <span className={`text-sm ${selPath === p ? "font-medium" : "text-[#5D0F17]/75"}`}>{pageLabel(p)}</span>
 <span className="block text-[10px] text-stone-300 truncate">{p}</span>
 </button>
 ))}
 <button onClick={() => window.dispatchEvent(new CustomEvent("vya:ask", { detail: "Help me edit my site" }))} className="m-4 text-xs underline text-stone-500 hover:text-[#5D0F17]">Ask VYA instead →</button>
 {isAdmin && <button onClick={async () => { if (!confirm("OWNER RESET: discards the captured site AND deletes all (non-sold) inventory, then switches to the simple design. This can’t be undone — continue?")) return; await fetch("/api/store/capture", { method: "DELETE" }).catch(() => {}); setCaptured(null); }} className="block mx-4 mb-4 text-[11px] text-stone-400 underline hover:text-[#5D0F17]">Use the simple design instead (owner)</button>}
 </div>
 {/* Visual editor */}
 <div className="flex-1 bg-[#e9e4da] p-3 lg:h-[calc(100vh-150px)]">
 <iframe key={`${selPath}-${previewKey}`} src={editSrc} className="w-full h-full bg-white border border-stone-200" title="Page editor" />
 </div>
 </div>
 </main>
 );
 }

 const heroProduct = products[0];
 const gridProducts = products.slice(0, 6);

 return (
 <main className="min-h-screen bg-stone-50 text-stone-900">
 <div className="flex flex-col lg:flex-row">
 {/* ───── Controls ───── */}
 <div className="lg:w-[440px] lg:shrink-0 lg:h-screen lg:overflow-y-auto border-r border-stone-200 bg-white">
 <div className="px-7 py-7">
 <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400 mb-1">{storeName}</p>
 <div className="flex items-center justify-between mb-1">
 <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Storefront</h1>
 <button type="button" onClick={() => { setEnabled(!enabled); }} className="flex items-center gap-2" aria-pressed={enabled}>
 <span className="text-[11px] uppercase tracking-[0.14em] text-stone-500">{enabled ? "Live" : "Off"}</span>
 <span className="relative h-6 w-11 rounded-full transition" style={{ background: enabled ? ink : "#5D0F1730" }}>
 <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all" style={{ left: enabled ? "22px" : "2px" }} />
 </span>
 </button>
 </div>
 <p className="text-xs text-stone-400 mb-6">A hosted, branded store for your inventory — pick a look, make it yours, share the link.</p>

 {/* Build with VYA — only when the store has no sections yet (else they edit by hand / ask VYA in chat) */}
 {blocks.length === 0 && (
 <div className="mb-6 border border-stone-300 bg-stone-50 p-4">
 <p className="text-[15px] font-semibold mb-1">Start in one click</p>
 <p className="text-xs text-stone-500 mb-3">Let VYA design a full storefront — homepage, About, FAQ &amp; shipping pages — from your products and brand. You can edit everything after.</p>
 <button onClick={generateStorefront} disabled={genBusy} className="w-full bg-[#5D0F17] text-white px-5 py-3 text-[13px] font-medium hover:bg-[#5D0F17]/85 transition disabled:opacity-50">{genBusy ? "VYA is designing your store…" : "Build my storefront with VYA ✨"}</button>
 {genBusy && <p className="mt-2 text-[11px] text-stone-400">Designing your homepage + pages — about 10–20 seconds.</p>}
 {genErr && <p className="mt-2 text-xs text-red-700">{genErr}</p>}
 </div>
 )}

 {/* Tabs */}
 <div className="flex gap-5 border-b border-stone-200 mb-6">
 {([["sections", "Sections"], ["design", "Design"], ["assets", "Photos"], ["details", "Details"], ["domain", "Domain"]] as const).map(([k, lbl]) => (
 <button key={k} onClick={() => { setTab(k); setSaved(false); }} className={`pb-2.5 text-[13px] font-medium -mb-px border-b-2 transition ${tab === k ? "border-[#5D0F17] text-[#5D0F17]" : "border-transparent text-stone-400 hover:text-stone-600"}`}>{lbl}</button>
 ))}
 </div>

 {/* ── Design tab ── */}
 {tab === "design" && (
 <div>
 <p className={label}>Template</p>
 <div className="grid grid-cols-2 gap-2.5 mb-7">
 {templates.map((t) => (
 <button key={t.id} onClick={() => applyTemplate(t)} className={`text-left border overflow-hidden transition ${template === t.id ? "border-[#5D0F17] ring-1 ring-[#5D0F17]" : "border-stone-200 hover:border-[#5D0F17]/40"}`}>
 <div className="h-16 flex items-center justify-center" style={{ background: t.colors.bg }}>
 <span className="text-base" style={{ color: t.colors.text, fontFamily: ff(t.fonts.heading) }}>{t.name}</span>
 </div>
 <div className="flex" style={{ height: 4 }}><span className="flex-1" style={{ background: t.colors.bg }} /><span className="flex-1" style={{ background: t.colors.text }} /><span className="flex-1" style={{ background: t.colors.accent }} /></div>
 </button>
 ))}
 </div>

 <p className={label}>Colors</p>
 <div className="space-y-2 mb-7">
 {([["bg", "Background"], ["text", "Text"], ["accent", "Accent"]] as const).map(([k, lbl]) => (
 <div key={k} className="flex items-center gap-3">
 <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(colors[k]) ? colors[k] : "#000000"} onChange={(e) => { setColors((c) => ({ ...c, [k]: e.target.value })); setSaved(false); }} className="h-9 w-11 cursor-pointer border border-stone-200 bg-white p-0.5 shrink-0" />
 <input value={colors[k]} onChange={(e) => { setColors((c) => ({ ...c, [k]: e.target.value })); setSaved(false); }} className={`${input} w-24 font-mono text-xs`} />
 <span className="text-sm text-stone-500">{lbl}</span>
 </div>
 ))}
 </div>

 <p className={label}>Fonts</p>
 <div className="space-y-3 mb-8">
 {([["heading", "Headings"], ["body", "Body"]] as const).map(([k, lbl]) => (
 <div key={k}>
 <label className="block text-xs text-stone-500 mb-1">{lbl}</label>
 <select value={fonts[k]} onChange={(e) => { setFonts((f) => ({ ...f, [k]: e.target.value })); setSaved(false); }} className={input} style={{ fontFamily: ff(fonts[k]) }}>
 {(k === "heading" ? headingFonts : bodyFonts).map((f) => <option key={f} value={f} style={{ fontFamily: ff(f) }}>{f}</option>)}
 </select>
 </div>
 ))}
 </div>

 <div className="flex items-center gap-4">
 <button onClick={saveDesign} disabled={busy} className="bg-[#5D0F17] text-white px-6 py-3 text-[13px] font-medium hover:bg-[#5D0F17]/85 transition disabled:opacity-50">{busy ? "Saving…" : "Save design"}</button>
 {saved && <span className="text-xs text-green-700">Saved ✓</span>}
 {err && <span className="text-xs text-red-700">{err}</span>}
 </div>
 </div>
 )}

 {/* ── Sections tab ── */}
 {tab === "sections" && (
 <div>
 <p className="text-xs text-stone-500 mb-3">Build each page from sections — add, reorder, edit. Or ask VYA to build a whole page.</p>
 {/* Page switcher */}
 <div className="mb-4 flex flex-wrap items-center gap-1.5">
 {[{ slug: "home", title: "Home" } as StorePage, ...extraPages].map((p) => (
 <span key={p.slug} className={`inline-flex items-center gap-1 border px-2.5 py-1 text-[11px] ${activeSlug === p.slug ? "border-[#5D0F17] bg-stone-50 text-[#5D0F17]" : "border-stone-200 text-stone-500"}`}>
 <button onClick={() => setActiveSlug(p.slug)}>{p.title}</button>
 {p.slug !== "home" && <button onClick={() => deletePage(p.slug)} className="text-stone-300 hover:text-red-700" title="Delete page">×</button>}
 </span>
 ))}
 <button onClick={addPage} className="border border-dashed border-stone-300 px-2.5 py-1 text-[11px] text-stone-500 transition hover:border-[#5D0F17]/45 hover:text-[#5D0F17]">+ New page</button>
 </div>
 <div className="space-y-2.5 mb-5">
 {curBlocks.map((b, i) => {
 const def = blockTypes.find((d) => d.type === b.type);
 const curBg = b.style?.bg || "";
 return (
 <div key={b.id} onDragOver={(e) => { if (dragIdx !== null) e.preventDefault(); }} onDrop={() => reorderTo(i)} className={`border bg-white transition ${dragIdx === i ? "border-[#5D0F17] opacity-50" : "border-stone-200"}`}>
 <div draggable onDragStart={() => setDragIdx(i)} onDragEnd={() => setDragIdx(null)} className="flex cursor-grab items-center justify-between border-b border-stone-200 bg-stone-50 px-3 py-2 active:cursor-grabbing">
 <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-stone-600"><span className="text-stone-300">⠿</span>{def?.label || b.type}</span>
 <div className="flex items-center gap-2 text-stone-400">
 <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className="hover:text-[#5D0F17] disabled:opacity-25">↑</button>
 <button onClick={() => moveBlock(i, 1)} disabled={i === curBlocks.length - 1} className="hover:text-[#5D0F17] disabled:opacity-25">↓</button>
 <button onClick={() => removeBlock(b.id)} className="hover:text-red-700">×</button>
 </div>
 </div>
 <div className="space-y-2 p-3">
 {def?.fields.map((f) => (
 <div key={f.key}>
 <label className="mb-1 block text-[11px] text-stone-500">{f.label}</label>
 {f.kind === "textarea" ? (
 <textarea value={b.props[f.key] || ""} onChange={(e) => setBlockProp(b.id, f.key, e.target.value)} className={`${input} min-h-[60px] resize-y`} />
 ) : (
 <input value={b.props[f.key] || ""} onChange={(e) => setBlockProp(b.id, f.key, e.target.value)} placeholder={f.kind === "image" ? "Image URL (or use the Photos tab)" : ""} className={input} />
 )}
 </div>
 ))}
 {b.type !== "announcement" && b.type !== "hero" && (
 <div>
 <label className="mb-1 block text-[11px] text-stone-500">Background</label>
 <div className="flex items-center gap-1.5">
 {([["", "Default"], ["accent", "Accent"], ["dark", "Dark"]] as const).map(([val, lbl]) => (
 <button key={lbl} onClick={() => setBlockBg(b.id, val)} className={`border px-2.5 py-1 text-[11px] ${curBg === val || (val === "" && !curBg) ? "border-[#5D0F17] text-[#5D0F17]" : "border-stone-200 text-stone-400"}`}>{lbl}</button>
 ))}
 <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(curBg) ? curBg : "#000000"} onChange={(e) => setBlockBg(b.id, e.target.value)} className="h-7 w-9 cursor-pointer border border-stone-200 bg-white p-0.5" title="Custom background color" />
 </div>
 </div>
 )}
 </div>
 </div>
 );
 })}
 {curBlocks.length === 0 && (
 <div className="border border-dashed border-stone-300 bg-white px-4 py-6 text-center">
 <p className="mb-3 text-xs text-stone-400">No sections on this page yet — add one below, or let VYA build it for you.</p>
 <button onClick={() => window.dispatchEvent(new CustomEvent("vya:ask", { detail: activeSlug === "home" ? "Build my whole storefront for me." : `Build out my "${extraPages.find((p) => p.slug === activeSlug)?.title || activeSlug}" page.` }))} className="inline-flex items-center gap-1.5 bg-[#5D0F17] text-white px-4 py-2 text-[13px] font-medium hover:bg-[#5D0F17]/85 transition">✨ Have VYA build it</button>
 </div>
 )}
 </div>

 <p className={label}>Add section</p>
 <div className="mb-6 grid grid-cols-2 gap-2">
 {blockTypes.map((d) => (
 <button key={d.type} onClick={() => addBlock(d.type)} className="border border-stone-200 bg-white px-3 py-2 text-left transition hover:border-[#5D0F17]/40">
 <span className="block text-xs font-medium text-[#5D0F17]">{d.label}</span>
 <span className="text-[10px] leading-tight text-stone-400">{d.description}</span>
 </button>
 ))}
 </div>

 <div className="flex items-center gap-4">
 <button onClick={saveBlocks} disabled={busy} className="bg-[#5D0F17] text-white px-6 py-3 text-[13px] font-medium hover:bg-[#5D0F17]/85 transition disabled:opacity-50">{busy ? "Saving…" : "Save sections"}</button>
 {saved && <span className="text-xs text-green-700">Saved ✓</span>}
 {err && <span className="text-xs text-red-700">{err}</span>}
 </div>
 </div>
 )}

 {/* ── Photos tab ── */}
 {tab === "assets" && (
 <div>
 <p className="text-xs text-stone-500 mb-4">Upload photos for your storefront — hero banners, lookbook shots, anything. Then drag one onto the hero in the preview, or hit “Set as hero.”</p>
 <label
 onDragOver={(e) => { e.preventDefault(); }}
 onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) uploadAssets(e.dataTransfer.files); }}
 className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-stone-300 bg-white py-8 text-center cursor-pointer hover:border-[#5D0F17]/40 transition mb-5"
 >
 <span className="text-sm text-stone-600">{assetBusy ? "Uploading…" : "Drop photos here or click to upload"}</span>
 <span className="text-[11px] text-stone-400">JPG / PNG, up to 15MB each</span>
 <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) uploadAssets(e.target.files); e.target.value = ""; }} />
 </label>
 {assets.length ? (
 <>
 <p className="text-[11px] text-stone-400 mb-2">Drag a photo onto the hero in the preview →</p>
 <div className="grid grid-cols-3 gap-2">
 {assets.map((a) => (
 <div key={a.url} draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", a.url); e.dataTransfer.effectAllowed = "copy"; }} className="group relative aspect-square overflow-hidden border border-stone-200 cursor-grab active:cursor-grabbing">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={a.url} alt="" className="h-full w-full object-cover pointer-events-none" />
 <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-1.5" style={{ background: "rgba(0,0,0,0.35)" }}>
 <button onClick={() => deleteAsset(a.url)} className="self-end h-5 w-5 rounded-full bg-white/90 text-[#5D0F17] text-xs leading-none">×</button>
 <button onClick={() => setHero(a.url)} className="bg-white/90 text-[#5D0F17] py-1 text-[10px] uppercase tracking-[0.12em]">Set as hero</button>
 </div>
 </div>
 ))}
 </div>
 </>
 ) : (
 <p className="text-xs text-stone-400 text-center py-6">No photos yet — upload your first above.</p>
 )}
 </div>
 )}

 {/* ── Details tab ── */}
 {tab === "details" && (
 <div>
 <div className="mb-5">
 <label className={label}>Storefront URL</label>
 <div className="flex items-stretch">
 <span className="inline-flex items-center bg-stone-100 border border-r-0 border-stone-200 px-3 text-sm text-stone-400">vyaplatform.com/s/</span>
 <input className={`${input} rounded-none`} value={handle} onChange={(e) => { setHandle(e.target.value); setSaved(false); }} placeholder="your-store" />
 </div>
 </div>
 <div className="mb-5">
 <label className={label}>Tagline</label>
 <input className={input} value={tagline} onChange={(e) => { setTagline(e.target.value); setSaved(false); }} placeholder="Curated vintage, one-of-one." maxLength={120} />
 </div>
 <div className="mb-5">
 <label className={label}>Hero image URL <span className="text-stone-300">(optional)</span></label>
 <input className={input} value={heroImage} onChange={(e) => { setHeroImage(e.target.value); setSaved(false); }} placeholder="https://…/banner.jpg" />
 </div>
 <div className="mb-7">
 <label className={label}>About <span className="text-stone-300">(optional)</span></label>
 <textarea className={`${input} min-h-[90px] resize-y`} value={about} onChange={(e) => { setAbout(e.target.value); setSaved(false); }} placeholder="A line or two about your store." maxLength={1000} />
 </div>
 <div className="flex items-center gap-4">
 <button onClick={saveDetails} disabled={busy} className="bg-[#5D0F17] text-white px-6 py-3 text-[13px] font-medium hover:bg-[#5D0F17]/85 transition disabled:opacity-50">{busy ? "Saving…" : "Save details"}</button>
 {saved && <span className="text-xs text-green-700">Saved ✓</span>}
 {err && <span className="text-xs text-red-700">{err}</span>}
 </div>
 </div>
 )}

 {/* ── Domain tab ── */}
 {tab === "domain" && (
 <div>
 {/* Free VYA address — every store has one, no domain required */}
 <div className="mb-6 border border-stone-200 bg-white p-4">
 <p className="text-[12px] font-medium text-stone-400 mb-1.5">Your store is already live</p>
 <div className="flex items-center justify-between gap-3">
 <p className="font-mono text-sm truncate">vyaplatform.com/s/{handle || "your-store"}</p>
 {handle && <a href={`/s/${handle}?preview=1`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-stone-500 hover:text-[#5D0F17]">View ↗</a>}
 </div>
 <p className="mt-2 text-xs text-stone-400">No domain needed — share this link to start selling today.</p>
 </div>

 <p className="text-[12px] font-medium text-stone-400 mb-2">Custom domain <span className="opacity-50 normal-case tracking-normal">— optional</span></p>
 <p className="text-xs text-stone-500 mb-4">Prefer your own? Use a domain you already own, or buy one from any registrar (GoDaddy, Namecheap, etc.) and connect it here.</p>
 {!dom.configured ? (
 <p className="text-xs text-stone-400 bg-stone-100 px-3 py-2.5">Custom domains aren’t enabled on the server yet.</p>
 ) : dom.domain ? (
 <div className="border border-stone-200 bg-white p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm">{dom.domain}</p>
 <p className="text-xs mt-0.5" style={{ color: dom.status?.verified && !dom.status?.misconfigured ? "#15803d" : "#b45309" }}>{dom.status?.verified && !dom.status?.misconfigured ? "Connected ✓" : "Pending DNS — add the record below, then re-check"}</p>
 </div>
 <button onClick={disconnectDomain} disabled={domBusy} className="text-[13px] font-medium text-stone-400 hover:text-red-700">Disconnect</button>
 </div>
 {dom.status && (dom.status.misconfigured || !dom.status.verified) && (
 <div className="mt-3 border-t border-stone-200 pt-3">
 <p className="text-[12px] font-medium text-stone-400 mb-2">Set this DNS record at your registrar</p>
 {dom.status.records.map((rec, i) => <div key={i} className="font-mono text-xs bg-stone-100 px-3 py-2 mb-1">{rec.type} &nbsp; {rec.name} &nbsp;→&nbsp; {rec.value}</div>)}
 {dom.status.verification?.map((v, i) => <div key={`v${i}`} className="font-mono text-xs bg-stone-100 px-3 py-2 mb-1">{v.type} &nbsp; {v.domain} &nbsp;→&nbsp; {v.value}</div>)}
 <button onClick={recheckDomain} disabled={domBusy} className="mt-2 text-[13px] font-medium underline text-stone-600 hover:text-[#5D0F17]">{domBusy ? "Checking…" : "Re-check"}</button>
 </div>
 )}
 </div>
 ) : (
 <div className="flex items-stretch gap-2">
 <input className={input} value={domInput} onChange={(e) => setDomInput(e.target.value)} placeholder="shop.yourbrand.com" />
 <button onClick={connectDomain} disabled={domBusy || !domInput} className="shrink-0 bg-[#5D0F17] text-white px-4 text-[13px] font-medium hover:bg-[#5D0F17]/85 disabled:opacity-50">{domBusy ? "…" : "Connect"}</button>
 </div>
 )}
 {domErr && <p className="mt-2 text-xs text-red-700">{domErr}</p>}

 {/* Buy a new domain through VYA */}
 {dom.configured && !dom.domain && (
 <div className="mt-6 border-t border-stone-200 pt-5">
 <p className="text-[12px] font-medium text-stone-400 mb-1">Don’t have one? Buy a domain</p>
 <p className="text-xs text-stone-500 mb-3">Search, buy, and connect a brand-new domain without leaving VYA.</p>
 <div className="flex items-stretch gap-2">
 <input className={input} value={dsearch} onChange={(e) => setDsearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchDomain()} placeholder="yourbrand.com" />
 <button onClick={searchDomain} disabled={dsBusy || !dsearch.trim()} className="shrink-0 border border-stone-300 px-4 text-[13px] font-medium hover:border-[#5D0F17] disabled:opacity-50">{dsBusy ? "…" : "Search"}</button>
 </div>
 {dres && (
 <div className="mt-3 border border-stone-200 bg-white p-3">
 <div className="flex items-center justify-between gap-3">
 <p className="font-mono text-sm">{dres.domain}</p>
 {dres.available && dres.priceCents != null ? <span className="text-sm" style={{ color: "var(--accent)" }}>${(dres.priceCents / 100).toFixed(2)}/yr</span> : <span className="text-xs text-stone-400">Taken</span>}
 </div>
 {dres.available && dres.priceCents != null && !showBuy && (
 <button onClick={() => setShowBuy(true)} className="mt-3 w-full bg-[#5D0F17] text-white px-4 py-2.5 text-[13px] font-medium hover:bg-[#5D0F17]/85">Buy &amp; connect — ${(dres.priceCents / 100).toFixed(2)}</button>
 )}
 {showBuy && dres.priceCents != null && (
 <div className="mt-3 border-t border-stone-200 pt-3 space-y-2">
 <p className="text-[11px] text-stone-400">Registrant contact (required to register a domain). Charged to your card on file.</p>
 <div className="grid grid-cols-2 gap-2">
 <input className={input} placeholder="First name" value={buyForm.firstName} onChange={(e) => setBuyForm({ ...buyForm, firstName: e.target.value })} />
 <input className={input} placeholder="Last name" value={buyForm.lastName} onChange={(e) => setBuyForm({ ...buyForm, lastName: e.target.value })} />
 </div>
 <input className={input} placeholder="Email" value={buyForm.email} onChange={(e) => setBuyForm({ ...buyForm, email: e.target.value })} />
 <input className={input} placeholder="Phone (e.g. +13015551234)" value={buyForm.phone} onChange={(e) => setBuyForm({ ...buyForm, phone: e.target.value })} />
 <input className={input} placeholder="Street address" value={buyForm.address1} onChange={(e) => setBuyForm({ ...buyForm, address1: e.target.value })} />
 <div className="grid grid-cols-3 gap-2">
 <input className={input} placeholder="City" value={buyForm.city} onChange={(e) => setBuyForm({ ...buyForm, city: e.target.value })} />
 <input className={input} placeholder="State" value={buyForm.state} onChange={(e) => setBuyForm({ ...buyForm, state: e.target.value })} />
 <input className={input} placeholder="ZIP" value={buyForm.zip} onChange={(e) => setBuyForm({ ...buyForm, zip: e.target.value })} />
 </div>
 <input className={input} placeholder="Country (US)" value={buyForm.country} onChange={(e) => setBuyForm({ ...buyForm, country: e.target.value })} />
 <button onClick={buyDomainNow} disabled={buyBusy} className="w-full bg-[#5D0F17] text-white px-4 py-2.5 text-[13px] font-medium hover:bg-[#5D0F17]/85 disabled:opacity-50">{buyBusy ? "Registering your domain…" : `Confirm — buy for $${(dres.priceCents / 100).toFixed(2)}`}</button>
 </div>
 )}
 </div>
 )}
 {buyMsg && <p className="mt-2 text-xs text-red-700">{buyMsg}</p>}
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 {/* ───── Live preview ───── */}
 <div className="flex-1 lg:h-screen lg:overflow-y-auto bg-[#e7e0d3] p-5 lg:p-9">
 <div className="mx-auto max-w-3xl">
 {/* browser chrome */}
 <div className="rounded-t-xl bg-[#f3efe7] border border-b-0 border-black/10 px-4 py-2.5 flex items-center gap-2">
 <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#e06c5e]" /><i className="h-2.5 w-2.5 rounded-full bg-[#e8b94e]" /><i className="h-2.5 w-2.5 rounded-full bg-[#69b45c]" /></span>
 <div className="ml-2 flex-1 truncate rounded bg-white/70 px-3 py-1 text-[11px] text-stone-400">vyaplatform.com/s/{handle || "your-store"}{activeSlug !== "home" ? `/${activeSlug}` : ""}</div>
 {handle && <a href={`/s/${handle}${activeSlug !== "home" ? `/${activeSlug}` : ""}?preview=1`} target="_blank" rel="noopener noreferrer" className="text-[11px] uppercase tracking-[0.12em] text-stone-500 hover:text-[#5D0F17]">Open ↗</a>}
 </div>

 {/* the storefront, live */}
 <div className="rounded-b-xl border border-black/10 overflow-hidden shadow-[0_20px_60px_-25px_rgba(0,0,0,0.4)]" style={{ background: colors.bg, color: colors.text, fontFamily: ff(fonts.body) }}>
 {/* header */}
 <div className="px-8 pt-7 pb-4 text-center" style={{ borderBottom: `1px solid ${colors.text}14` }}>
 <p className="text-2xl tracking-wide" style={{ fontFamily: ff(fonts.heading) }}>{storeName}</p>
 <div className="mt-2.5 flex flex-wrap justify-center gap-5 text-[10px] uppercase tracking-[0.18em]" style={{ opacity: 0.6 }}>
 <button onClick={() => setActiveSlug("home")} className={activeSlug === "home" ? "underline" : ""}>Home</button>
 <span>Shop</span>
 {extraPages.map((p) => <button key={p.slug} onClick={() => setActiveSlug(p.slug)} className={activeSlug === p.slug ? "underline" : ""}>{p.title}</button>)}
 </div>
 </div>

 {curBlocks.length > 0 ? (
 <Blocks blocks={curBlocks} colors={colors} fonts={fonts} products={products.map((p) => ({ title: p.title, price: money(p.price, p.currency), image: p.image }))} />
 ) : (<>
 {/* hero — drop a photo from the library here to set it */}
 <div className="relative" onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; if (!dragHero) setDragHero(true); }} onDragLeave={() => setDragHero(false)} onDrop={(e) => { e.preventDefault(); setDragHero(false); const url = e.dataTransfer.getData("text/plain"); if (url) setHero(url); }}>
 {heroImage ? (
 // eslint-disable-next-line @next/next/no-img-element
 <div className="relative h-60 w-full overflow-hidden"><img src={heroImage} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ background: "rgba(0,0,0,0.25)" }}><p className="text-3xl text-white" style={{ fontFamily: ff(fonts.heading) }}>{tagline || "New Arrivals"}</p></div></div>
 ) : heroProduct ? (
 <div className="grid grid-cols-2 items-center">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={heroProduct.image} alt="" className="h-72 w-full object-cover" />
 <div className="px-8 text-center">
 <p className="text-3xl mb-3" style={{ fontFamily: ff(fonts.heading) }}>New Arrivals</p>
 <p className="text-xs mb-5" style={{ opacity: 0.7 }}>{tagline || "Curated vintage, one-of-one."}</p>
 <span className="inline-block px-7 py-2.5 text-[10px] uppercase tracking-[0.18em]" style={{ background: colors.accent, color: colors.bg }}>Shop now</span>
 </div>
 </div>
 ) : (
 <div className="px-8 py-14 text-center">
 <p className="text-4xl mb-3" style={{ fontFamily: ff(fonts.heading) }}>New Arrivals</p>
 <p className="text-xs mb-5" style={{ opacity: 0.7 }}>{tagline || "Curated vintage, one-of-one."}</p>
 <span className="inline-block px-7 py-2.5 text-[10px] uppercase tracking-[0.18em]" style={{ background: colors.accent, color: colors.bg }}>Shop now</span>
 </div>
 )}
 {dragHero && <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-white pointer-events-none" style={{ background: "rgba(93,15,23,0.45)" }}><span className="text-white text-xs uppercase tracking-[0.18em]">Drop to set as hero</span></div>}
 </div>

 {/* product grid */}
 <div className="px-8 py-9">
 <p className="text-center text-lg mb-6" style={{ fontFamily: ff(fonts.heading) }}>The Edit</p>
 {gridProducts.length ? (
 <div className="grid grid-cols-3 gap-x-4 gap-y-7">
 {gridProducts.map((p, i) => (
 <div key={i}>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <div className="aspect-[3/4] overflow-hidden" style={{ background: `${colors.text}0d` }}><img src={p.image} alt="" className="h-full w-full object-cover" /></div>
 <p className="mt-2 text-[11px] leading-tight truncate">{p.title}</p>
 <p className="text-[11px]" style={{ color: colors.accent }}>{money(p.price, p.currency)}</p>
 </div>
 ))}
 </div>
 ) : (
 <div className="grid grid-cols-3 gap-4">
 {[0, 1, 2].map((i) => <div key={i}><div className="aspect-[3/4]" style={{ background: `${colors.text}10` }} /><p className="mt-2 text-[11px]" style={{ opacity: 0.7 }}>Vintage piece</p><p className="text-[11px]" style={{ color: colors.accent }}>$120</p></div>)}
 </div>
 )}
 </div>
 </>)}

 {/* footer */}
 <div className="px-8 py-6 text-center text-[10px] uppercase tracking-[0.18em]" style={{ borderTop: `1px solid ${colors.text}14`, opacity: 0.5 }}>{storeName} · Powered by VYA</div>
 </div>
 </div>
 </div>
 </div>
 </main>
 );
}
