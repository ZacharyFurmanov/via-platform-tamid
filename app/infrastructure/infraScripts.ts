// @ts-nocheck
/* eslint-disable */
// Vanilla JS ported verbatim from the mockup (scroll-reveal, the texting/listing
// demo, the build-a-store / import generator, count-up stats, particle net, lens,
// hero parallax, Formspree handler). Runs client-side from a useEffect.
export function initInfra() {
const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');
  if(e.target.querySelectorAll)e.target.querySelectorAll('.bar i').forEach(b=>{b.style.width=b.dataset.w});
  io.unobserve(e.target);}})},{threshold:.16});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
const hdr=document.getElementById('hdr');
addEventListener('scroll',()=>{hdr.classList.toggle('scrolled',scrollY>20)});

(function(){
 const $=id=>document.getElementById(id);
 const cd=$('cd');if(!cd)return;
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const show=el=>el&&el.classList.add('show'),hide=el=>el&&el.classList.remove('show');
 let size=null;
 async function play(){
   await sleep(300);show($('cdPhoto'));await sleep(500);show($('cdM1'));
   await sleep(750);show($('cdT1'));await sleep(1150);hide($('cdT1'));show($('cdM2'));
   await sleep(650);show($('cdT2'));await sleep(1350);hide($('cdT2'));show($('cdCard'));
   cd.querySelectorAll('#cdCard .cdchip').forEach((c,i)=>setTimeout(()=>c.classList.add('show'),i*150));
   await sleep(1050);show($('cdT3'));await sleep(1250);hide($('cdT3'));show($('cdM4'));
   await sleep(400);show($('cdControls'));show($('cdPost'));
 }
 function reset(){
   ['cdPhoto','cdM1','cdM2','cdCard','cdM4','cdM5','cdControls','cdPost','cdSuccess','cdReplay','cdLive'].forEach(id=>hide($(id)));
   cd.querySelectorAll('.typing').forEach(hide);
   cd.querySelectorAll('.cdchip').forEach(c=>c.classList.remove('show'));
   cd.querySelectorAll('.qchip').forEach(c=>c.classList.remove('sel'));
   $('cdPriceRow').style.display='none';
   const p=$('cdPost');p.classList.remove('ready');p.textContent='Tap a size to continue';size=null;
 }
 cd.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{
   cd.querySelectorAll('[data-size]').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');
   size=b.dataset.size;$('cdPriceRow').style.display='flex';$('cdPost').textContent='Now the price →';
 });
 cd.querySelectorAll('[data-price]').forEach(b=>b.onclick=()=>{
   if(!size)return;cd.querySelectorAll('[data-price]').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');
   $('cdM5').textContent='Size '+size+' · '+b.dataset.price;show($('cdM5'));
   const p=$('cdPost');p.classList.add('ready');p.textContent='Post listing →';
 });
 $('cdPost').onclick=()=>{if(!$('cdPost').classList.contains('ready'))return;
   hide($('cdControls'));hide($('cdPost'));show($('cdLive'));show($('cdSuccess'));show($('cdReplay'));};
 $('cdReplay').onclick=()=>{reset();play();};
 new IntersectionObserver((es,o)=>{es.forEach(e=>{if(e.isIntersecting){play();o.unobserve(cd);}})},{threshold:.4}).observe(cd);
})();
(function(){
 const $=id=>document.getElementById(id);
 const res=$('resultStore'),gen=$('genState'),tag=$('resultTag');if(!res)return;
 const storeEl=res.querySelector('.store'),nameEl=res.querySelector('.nm'),tagEl=res.querySelector('.tg'),urlEl=res.querySelector('.url'),grid=res.querySelector('.pgrid');
 const palettes={
  mono:{keys:['black and white','black & white','b&w','monochrome','black-and-white','greyscale','grayscale'],bg:'#ffffff',name:'#141414',tag:'#777777',tiles:['#222,#7e7e7e','#333,#9a9a9a','#3a3a3a,#aeaeae','#2a2a2a,#8a8a8a']},
  oldmoney:{keys:['old money','old-money','heritage','timeless','quiet luxury','classic','refined','preppy','elevated','ivory'],bg:'#f3efe6',name:'#29302a',tag:'#8a8478',tiles:['#2f3a30,#a3b09c','#34465e,#9fb0c4','#6b5836,#cdba92','#3a352f,#9c9182']},
  warm:{keys:['warm','earthy','sunset','desert','terracotta','cozy','rust','autumn'],bg:'#f6efe3',name:'#4a2f22',tag:'#9a7b4f',tiles:['#7d4a2f,#d8b48f','#9a7b4f,#e3d3b4','#8a5a3a,#d8b48f','#6b4a2f,#c9a886']},
  bold:{keys:['bold','colorful','playful','fun','pop','vibrant','electric','bright','loud'],bg:'#fdf6f8',name:'#7a1f4d',tag:'#b56b8d',tiles:['#b5396b,#f0a8c6','#6a3bb5,#c2a8ee','#b59a3b,#eee0a8','#3bb59a,#a8eedd']},
  dark:{keys:['dark','moody','noir','gothic','midnight','after hours'],bg:'#1f1c19',name:'#f3e7da',tag:'#b8a99a',tiles:['#2a2622,#6a6258','#3a2a2a,#7a6a6a','#2a2a35,#6a6a82','#352a2a,#7a6a6a']},
  vya:{keys:[],bg:'#ffffff',name:'#2c241d',tag:'#9b7d83',tiles:['#7d2230,#c99a86','#6f6153,#cdc1b0','#9b7d83,#e4d3cc','#46101a,#8d6b5a']}
 };
 const prodSets={
  timeless:[['Power-shoulder blazer','$240'],['Silk blouse','$120'],['Wool trench','$320'],['Leather loafers','$160']],
  y2k:[['Low-rise bootcut','$95'],['Baby tee','$48'],['Rhinestone belt','$62'],['Trucker cap','$70']],
  seventies:[['Tan suede jacket','$168'],['Fringe bag','$120'],['Prairie maxi','$88'],['Western boots','$140']],
  vya:[['Deconstructed blazer','$420'],['Tan suede jacket','$168'],['Low-rise denim','$95'],['Quilted flap bag','$1,850']]
 };
 const pickPalette=t=>{t=' '+t.toLowerCase()+' ';for(const k in palettes){if(palettes[k].keys.some(s=>t.includes(s)))return palettes[k];}return palettes.vya;};
 const eras=t=>{const m=t.toLowerCase().match(/\b(50s|60s|70s|80s|90s|2000s|00s|y2k)\b/g);return m?[...new Set(m.map(e=>e==='y2k'?'Y2K':e==='00s'?'2000s':e))]:[];};
 const pickProds=(t,er)=>{t=t.toLowerCase();if(t.includes('y2k')||er.includes('Y2K')||er.includes('2000s'))return prodSets.y2k;if(t.includes('70s')||t.includes('boho')||t.includes('western'))return prodSets.seventies;if(er.length||/timeless|old money|classic|quality|tailored|quiet luxury|minimal|heritage/.test(t))return prodSets.timeless;return prodSets.vya;};
 function parseName(t){
   let m=t.match(/(?:building|launching|starting|call(?:ed)?|named?|it'?s)\s+(?:my\s+(?:store|shop|brand)\s+)?((?:the\s+)?[A-Z][\w'&]*(?:\s+[A-Z][\w'&]*){0,4})/);
   if(m)return m[1].trim();
   m=t.match(/^["'“]?((?:the\s+)?[A-Z][\w'&]*(?:\s+[A-Z][\w'&]*){0,3})\s*[—–.,:]/);
   if(m)return m[1].trim();
   m=t.match(/["“]([^"”]{2,30})["”]/);
   if(m)return m[1].trim();
   return null;
 }
 function parseTag(t,er){
   const tl=t.toLowerCase(),vals=[];
   [['timeless','timeless'],['quality','quality'],['rare','rare finds'],['curated','curated'],['archival','archival'],['quiet luxury','quiet luxury'],['sustainable','sustainable'],['luxury','luxury'],['heritage','heritage']].forEach(([k,v])=>{if(tl.includes(k))vals.push(v);});
   const era=er.length?er.join(' & '):'';
   const desc=vals.slice(0,2).join(' · ');
   if(era&&desc)return era+' · '+desc;
   if(era)return era+' vintage';
   if(desc)return desc;
   return 'Curated vintage';
 }
 const slug=n=>n.toLowerCase().replace(/[^a-z0-9]/g,'')+'.vya.shop';
 const titleize=s=>s.replace(/\b\w/g,c=>c.toUpperCase());
 const fromUrl=u=>{u=u.replace(/^https?:\/\//,'').replace(/^www\./,'');let h=u.split('/')[0].split('.')[0];if(['shop','store'].includes(h))h=u.split('/')[0].split('.')[1]||h;return titleize(h.replace(/[-_]/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2'));};
 function paint(pal,name,tagText,prods){
   storeEl.style.background=pal.bg;nameEl.style.color=pal.name;tagEl.style.color=pal.tag;
   nameEl.textContent=name;tagEl.textContent=tagText;urlEl.textContent=slug(name);
   grid.innerHTML=prods.map((p,i)=>`<div class="prod"><div class="img" style="background:linear-gradient(155deg,${pal.tiles[i%pal.tiles.length]})"><div class="meta"><div class="pn">${p[0]}</div><div class="pp">${p[1]}</div></div></div></div>`).join('');
   tag.textContent='✓ Store ready — published to '+slug(name);
 }
 const SSWIMG='https://images.squarespace-cdn.com/content/v1/681a7e7f321f915140724edc/';
 const KNOWN={'sassysowhat.com':{name:'SASSYSOWHAT',tag:'Curated collectible designer · with attitude',url:'sassysowhat.com',bg:'#fdf3f7',nc:'#7a1f4d',tc:'#b5476b',prods:[['Rare Pink Pearl Louboutin Heels','$350',SSWIMG+'8d3e9dfa-702c-4bf9-a16e-94715390719d/9B2D5344-77AB-480E-9C11-5BD18C6A4A2E.jpg?format=500w'],['Silver Jimmy Choo Heels','$300',SSWIMG+'e49599a4-cae0-41db-97fe-32a49b61bf05/C44A5612-5CE2-4982-A66D-34E4A65B0812.jpg?format=500w'],['Cool Chanel Platform Pumps','$450',SSWIMG+'ba2431da-9771-479a-a6c4-957b1a80ebe8/99FB5158-2D2A-4867-9819-4717765CBE49.jpg?format=500w'],['Rare Italian Snakeskin Spike Heel','$350',SSWIMG+'72ab0c3c-e120-40b5-bea1-f4c232726b2f/8330C9A0-52B5-46A0-95F1-1A8DBFECA533.jpg?format=500w']]}};
 const SPIN='<span class="spin"></span> Designing your storefront…';
 // "Import a site" calls /api/public/import-store, which pulls a real Shopify
 // (public products.json) or Squarespace (?format=json) storefront server-side
 // and returns live products + images. KNOWN/paint are the offline fallback when
 // a site can't be read (password-protected, unsupported platform, empty, etc.).
 // TODO(backend): "Build a store from a sentence" is still keyword-driven (palette
 // + product-set matching below). The real version should call an AI model on the
 // backend to generate the storefront design, copy, and product suggestions.
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function finishGen(){gen.innerHTML=SPIN;gen.classList.remove('show');res.classList.add('show');tag.classList.add('show');}
 function paintReal(name,tagText,urlText,prods,brand){
   storeEl.style.background='#fff';nameEl.style.color=brand||'#2c241d';tagEl.style.color='#9b7d83';
   nameEl.textContent=name;tagEl.textContent=tagText;urlEl.textContent=urlText;
   grid.innerHTML=prods.slice(0,8).map(p=>"<div class='prod'><div class='img' style=\"background-image:url('"+String(p.image).replace(/'/g,'%27')+"');background-size:cover;background-position:center;background-color:#efe6d7\"><div class='meta'><div class='pn'>"+esc(p.name)+"</div><div class='pp'>"+esc(p.price)+"</div></div></div></div>").join('');
 }
 async function runImport(){
   const u=($('importUrl').value||'').trim();
   const dom=u?u.replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0].toLowerCase():'your-site.com';
   res.classList.remove('show');tag.classList.remove('show');gen.classList.add('show');
   gen.textContent='Reading '+dom+'…';
   setTimeout(()=>{if(gen.classList.contains('show'))gen.textContent='Importing listings, photos & details…';},900);
   try{
     const r=await fetch('/api/public/import-store?url='+encodeURIComponent(u||dom));
     const d=await r.json();
     if(d&&d.ok&&Array.isArray(d.products)&&d.products.length){
       paintReal(d.storeName||fromUrl(dom),'Imported from '+dom,dom+' · rebuilt on VYA',d.products,d.brandColor);
       tag.textContent='✓ Imported '+d.products.length+' live listings from '+dom+' — rebuilt on VYA';
       finishGen();return;
     }
     throw new Error((d&&d.error)||'no products');
   }catch(e){
     const key=Object.keys(KNOWN).find(k=>dom.includes(k.split('.')[0]));
     if(key){const s=KNOWN[key];storeEl.style.background=s.bg;nameEl.style.color=s.nc;tagEl.style.color=s.tc;
       nameEl.textContent=s.name;tagEl.textContent=s.tag;urlEl.textContent=s.url;
       grid.innerHTML=s.prods.map(p=>"<div class='prod'><div class='img' style=\"background-image:url('"+p[2]+"');background-size:cover;background-position:center\"><div class='meta'><div class='pn'>"+p[0]+"</div><div class='pp'>"+p[1]+"</div></div></div></div>").join('');
       tag.textContent='✓ Imported from '+dom+' — rebuilt on VYA';
     } else {paint(palettes.vya,fromUrl(dom)||'Imported Store','Imported from '+dom,prodSets.vya);tag.textContent='Preview — connect this store to import it live';}
     finishGen();
   }
 }
 function generate(mode){
   res.classList.remove('show');tag.classList.remove('show');gen.classList.add('show');
   if(mode==='import'){runImport();return;}
   const t=$('prompt').value||'';
   const pal=pickPalette(t),er=eras(t),name=parseName(t)||'Your Vintage Store',tg=parseTag(t,er),prods=pickProds(t,er);
   gen.innerHTML=SPIN;
   setTimeout(()=>{paint(pal,name,tg,prods);gen.classList.remove('show');res.classList.add('show');tag.classList.add('show');},1400);
 }
 document.querySelectorAll('.tab').forEach(tb=>tb.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));tb.classList.add('on');const d=tb.dataset.tab==='desc';$('paneDesc').style.display=d?'block':'none';$('paneImport').style.display=d?'none':'block';});
 const chipMap={'Old money · B&W':'The Heritage Club — timeless 80s & 90s tailoring. Black and white, old money.','Warm & earthy':'Sunset Supply — 70s boho and western finds. Warm, earthy, cozy.','Bold & playful':'Loud Era — Y2K and 2000s pieces. Bold, colorful, playful.','Dark & moody':'After Hours — 90s grunge and archival. Dark and moody.'};
 document.querySelectorAll('.pchip').forEach(c=>c.onclick=()=>{$('prompt').value=chipMap[c.textContent.trim()]||c.textContent;generate('desc');});
 const bb=$('buildBtn'),ib=$('importBtn');if(bb)bb.onclick=()=>generate('desc');if(ib)ib.onclick=()=>generate('import');
 new IntersectionObserver((es,o)=>{es.forEach(e=>{if(e.isIntersecting){generate('desc');o.unobserve(res);}})},{threshold:.3}).observe(res);
})();

// living particle network
function makeNet(cv,color,count,linkDist,react){
 if(!cv)return;const ctx=cv.getContext('2d');let w,h,P,mx=-9999,my=-9999;
 function size(){w=cv.width=cv.clientWidth;h=cv.height=cv.clientHeight;P=[];for(let i=0;i<count;i++)P.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.45,vy:(Math.random()-.5)*.45});}
 function step(){ctx.clearRect(0,0,w,h);
  for(const p of P){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1;}
  ctx.strokeStyle=color;ctx.lineWidth=1;
  for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const a=P[i],b=P[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);if(d<linkDist){ctx.globalAlpha=(1-d/linkDist)*.45;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}
  if(react)for(const p of P){const dx=p.x-mx,dy=p.y-my,d=Math.hypot(dx,dy);if(d<170){ctx.globalAlpha=(1-d/170)*.6;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(mx,my);ctx.stroke();}}
  ctx.globalAlpha=.85;ctx.fillStyle=color;for(const p of P){ctx.beginPath();ctx.arc(p.x,p.y,1.5,0,7);ctx.fill();}
  requestAnimationFrame(step);}
 size();step();addEventListener('resize',size);
 if(react){const host=cv.parentElement;host.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top;});host.addEventListener('mouseleave',()=>{mx=my=-9999;});}
}
// count up
function countUp(el){const t=+el.dataset.count,suf=el.dataset.suffix||'',pre=el.dataset.prefix||'';let s=null;
 function f(ts){if(!s)s=ts;const p=Math.min((ts-s)/1700,1),e=1-Math.pow(1-p,3);el.textContent=pre+Math.floor(e*t).toLocaleString()+suf;if(p<1)requestAnimationFrame(f);else el.textContent=pre+t.toLocaleString()+suf;}
 requestAnimationFrame(f);}
const cuo=new IntersectionObserver((es,o)=>{es.forEach(e=>{if(e.isIntersecting){countUp(e.target);o.unobserve(e.target);}})},{threshold:.5});
document.querySelectorAll('[data-count]').forEach(el=>cuo.observe(el));
// cursor lens images
document.querySelectorAll('.lens').forEach(el=>{const img=el.querySelector('img');
 el.addEventListener('mousemove',e=>{const r=el.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;el.style.setProperty('--mx',x+'px');el.style.setProperty('--my',y+'px');const rx=((y/r.height)-.5)*-7,ry=((x/r.width)-.5)*7;if(img)img.style.transform='scale(1.07) rotateX('+rx+'deg) rotateY('+ry+'deg)';});
 el.addEventListener('mouseleave',()=>{el.style.setProperty('--mx','50%');el.style.setProperty('--my','50%');if(img)img.style.transform='';});
});
// hero parallax
const hv=document.querySelector('.hero-vis'),hero=document.querySelector('.hero');
if(hv&&hero){hero.addEventListener('mousemove',e=>{const r=hero.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;hv.style.transform='translate('+(x*-18)+'px,'+(y*-12)+'px)';});hero.addEventListener('mouseleave',()=>{hv.style.transform='';});}

(function(){
 const jf=document.getElementById('join');if(!jf)return;
 jf.addEventListener('submit',async function(e){e.preventDefault();
  const btn=jf.querySelector('button');const old=btn.textContent;btn.textContent='Joining…';
  try{const r=await fetch(jf.action,{method:'POST',body:new FormData(jf),headers:{Accept:'application/json'}});
   if(r.ok){jf.innerHTML='<div style="font-family:var(--head);font-size:24px;color:var(--oxblood)">You&#39;re on the list — we&#39;ll be in touch.</div>';}
   else{btn.textContent=old;}
  }catch(err){btn.textContent=old;}
 });
})();
}
