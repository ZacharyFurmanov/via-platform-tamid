import { NextRequest } from "next/server";
import { getCaptureOrigin } from "@/app/lib/site-capture-db";

export const dynamic = "force-dynamic";

// A shopper's "Saved" page on a store's own storefront. Self-contained VYA page that
// client-side fetches the shopper's favorites (credentialed → via_shopper cookie) and
// renders them with buy links. Works on the seller's own domain too.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
 const { slug } = await params;
 const origin = (await getCaptureOrigin(slug).catch(() => null)) || "";
 const backHref = origin ? `/site/${slug}` : `/site/${slug}`;

 const html = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Saved</title>
<style>
:root{--ink:#1c1917;--muted:#78716c;--line:#eee7df;--bg:#faf8f5;--accent:#5D0F17}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
.wrap{max-width:960px;margin:0 auto;padding:28px 20px 60px}
.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
a{color:inherit;text-decoration:none}
.back{font-size:13px;color:var(--muted)}
h1{font-size:24px;font-weight:600;letter-spacing:-.01em;margin:0 0 20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:18px}
.card{background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
.ph{aspect-ratio:3/4;background:#f0ebe4;overflow:hidden}
.ph img{width:100%;height:100%;object-fit:cover;display:block}
.body{padding:11px 12px 13px}
.t{font-size:13px;font-weight:500;line-height:1.35;margin:0 0 3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.p{font-size:13px;color:var(--muted);margin:0 0 9px}
.cta{display:block;text-align:center;background:var(--ink);color:#fff;font-size:12px;padding:8px;border-radius:7px}
.sold{background:#f0ebe4;color:var(--muted);font-size:11px;text-align:center;padding:7px;border-radius:7px}
.empty{text-align:center;color:var(--muted);font-size:14px;padding:70px 0}
.empty a{color:var(--accent);text-decoration:underline}
</style></head>
<body><div class="wrap">
<div class="top"><a class="back" href="${backHref}">← Back to store</a></div>
<h1>Saved</h1>
<div id="content"><p style="color:var(--muted);font-size:14px">Loading…</p></div>
</div>
<script>(function(){
var API="https://vyaplatform.com/api/storefront/favorite/list?slug="+encodeURIComponent(${JSON.stringify(slug)});
var el=document.getElementById('content');
function money(c){return '$'+Math.round((c||0)/100).toLocaleString();}
function esc(s){return String(s||'').replace(/[&<>"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];});}
fetch(API,{credentials:'include'}).then(function(r){return r.json()}).then(function(d){
 var f=(d&&d.favorites)||[];
 if(!f.length){el.innerHTML='<div class="empty">Nothing saved yet.<br/>Tap “♡ Save” on any piece to keep it here.<br/><br/><a href="${backHref}">Browse the store →</a></div>';return;}
 el.innerHTML='<div class="grid">'+f.map(function(it){
  var img=it.image?'<img src="'+esc(it.image)+'" alt=""/>':'';
  var buy=it.status==='active'?'<a class="cta" href="/checkout?item='+encodeURIComponent(it.itemId)+'">View</a>':'<div class="sold">Sold</div>';
  return '<div class="card"><div class="ph">'+img+'</div><div class="body"><p class="t">'+esc(it.title)+'</p><p class="p">'+money(it.priceCents)+'</p>'+buy+'</div></div>';
 }).join('')+'</div>';
}).catch(function(){el.innerHTML='<div class="empty">Couldn’t load your saved items.</div>';});
})();</script></body></html>`;

 return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
