"use strict";
/* NODEX — storefront views: home, catalogue, product, cart, checkout, order confirmation. */
/* ============ VIEWS ============ */
const stBadge=p=>p.stock<=0?'<span class="st bad">Out of stock</span>':p.stock<=CFG.lowStock?`<span class="st warn">Only ${p.stock} left</span>`:'<span class="st ok">In stock</span>';
function card(p){return `<article class="card"><a class="thumb" href="#/product/${p.id}">${art(p)}</a><div class="cbody">
  <div class="mono">${esc(p.category)}</div><a class="cname" href="#/product/${p.id}">${esc(p.name)}</a>
  <div class="row"><span class="price">${fmt(p.price)}</span>${stBadge(p)}</div>
  <button class="btn" data-act="add" data-id="${p.id}" ${p.stock<=0?'disabled':''}>${p.stock<=0?'Unavailable':'Add to cart'}</button></div></article>`}
function filtered(){
  const f=S.filter;let a=S.products.filter(p=>(f.cat==='All'||p.category===f.cat)&&(!f.inStock||p.stock>0)&&(!f.q||(p.name+' '+p.category+' '+p.description).toLowerCase().includes(f.q.toLowerCase())));
  const s={price_asc:(x,y)=>x.price-y.price,price_desc:(x,y)=>y.price-x.price,name:(x,y)=>x.name.localeCompare(y.name),featured:(x,y)=>(!!y.featured)-(!!x.featured)}[f.sort];
  return a.sort(s);
}
function gridHtml(){const a=filtered();return a.length?a.map(card).join(''):'<div class="empty" style="grid-column:1/-1">No products match the current filters.</div>'}
function catalogue(){
  const f=S.filter;
  return `<h2 class="sec" id="catalogue">Catalogue <span class="mono" id="count">${filtered().length} items</span></h2>
  <div class="toolbar"><input type="search" id="q" placeholder="Search products" value="${esc(f.q)}" data-in="q">
  <div class="pills" id="pills">${pillsHtml()}</div><span class="sp"></span>
  <label class="chk"><input type="checkbox" data-in="stock" ${f.inStock?'checked':''}> In stock only</label>
  <select data-in="sort"><option value="featured">Featured</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="name">Name</option></select></div>
  <div class="grid" id="grid">${gridHtml()}</div>`;
}
const pillsHtml=()=>cats().map(c=>`<button class="pill ${S.filter.cat===c?'on':''}" data-act="cat" data-v="${esc(c)}">${esc(c)}</button>`).join('');
function refreshGrid(){const g=$('#grid');if(!g)return;g.innerHTML=gridHtml();$('#count').textContent=filtered().length+' items';$('#pills').innerHTML=pillsHtml()}

function heroSlide(h,i,n){
  const hue=Number.isFinite(+h.hue)?+h.hue:200;
  return `<article class="slide ${i===0?'active':''}" role="group" aria-roledescription="slide" aria-label="${i+1} of ${n}"><div class="copy"><span class="mono">// Featured product</span><h1>${esc(h.name).replace(/^(\S+)/,'<em>$1</em>')}</h1>
   <p>${esc(h.description)}</p><div class="chips">${(h.specs||[]).slice(0,3).map(s=>`<span class="chip">${esc(s[1])}</span>`).join('')}</div>
   <div class="row"><span class="price">${fmt(h.price)}</span><button class="btn" data-act="add" data-id="${h.id}">Add to cart</button><a class="btn ghost" href="#/product/${h.id}">View details</a></div></div>
   <div class="art" style="--h:${hue}"><div class="glow"></div><div class="art-in"><div class="float">${art(h)}</div></div></div></article>`;
}
function viewHome(){
  let hs=S.products.filter(p=>p.featured&&p.stock>0).slice(0,CFG.heroMax||5);
  if(!hs.length){const f=S.products.find(p=>p.stock>0);if(f)hs=[f]}
  const n=hs.length,pad=v=>String(v).padStart(2,'0');
  const ui=n>1?`<button class="hbtn prev" data-hero="prev" aria-label="Previous product">‹</button><button class="hbtn next" data-hero="next" aria-label="Next product">›</button>
   <div class="hcount mono"><b id="hc">01</b> / ${pad(n)}</div>
   <div class="hdots">${hs.map((_,i)=>`<button class="hdot ${i===0?'on':''}" data-hero="${i}" aria-label="Show product ${i+1}"></button>`).join('')}</div>
   <div class="hbar"><i id="hbar"></i></div>`:'';
  const hero=n?`<section class="hero" id="hero" data-dir="next" role="region" aria-roledescription="carousel" aria-label="Featured products"><div class="slides">${hs.map((h,i)=>heroSlide(h,i,n)).join('')}</div>${ui}</section>`:'';
  const tiles=`<div class="tiles">${cats().slice(1).map(c=>`<button class="tile" data-act="cat" data-v="${esc(c)}" data-go="1"><span class="mono">Category</span><b>${esc(c)}</b><span class="mono">${S.products.filter(p=>p.category===c).length} items</span></button>`).join('')}</div>`;
  return hero+tiles+catalogue();
}
function viewShop(){return catalogue()}

function viewProduct(id){
  const p=getP(id);if(!p)return '<div class="empty" style="margin-top:30px">Product not found. <a href="#/shop" style="color:var(--accent)">Back to catalogue</a></div>';
  const q=Math.min(S.pdQty,Math.max(1,p.stock));S.pdQty=q;
  const rel=S.products.filter(x=>x.category===p.category&&x.id!==p.id).slice(0,4);
  return `<div class="crumb"><a href="#/">Home</a> / <a href="#/shop">Catalogue</a> / ${esc(p.category)}</div>
  <div class="pgrid"><div class="pimg">${art(p)}</div><div class="pinfo">
  <span class="mono">${esc(p.category)} · SKU ${esc(p.sku||String(p.id).slice(0,8)).toUpperCase()}</span><h1>${esc(p.name)}</h1>
  <div class="row" style="margin-bottom:14px"><span class="price">${fmt(p.price)}</span>${stBadge(p)}</div>
  <p style="color:var(--muted)">${esc(p.description)}</p>
  <div class="row" style="margin:20px 0"><div class="qty"><button data-act="pdq" data-d="-1">−</button><span>${q}</span><button data-act="pdq" data-d="1">+</button></div>
  <button class="btn" data-act="add" data-id="${p.id}" data-q="pd" ${p.stock<=0?'disabled':''}>${p.stock<=0?'Out of stock':'Add to cart'}</button></div>
  <h3 class="mono" style="margin:26px 0 6px">Specifications</h3>
  <table class="specs">${(p.specs||[]).map(s=>`<tr><td>${esc(s[0])}</td><td>${esc(s[1])}</td></tr>`).join('')||'<tr><td colspan="2">No specifications listed.</td></tr>'}</table></div></div>
  ${rel.length?`<h2 class="sec">Related <span class="mono">${esc(p.category)}</span></h2><div class="grid">${rel.map(card).join('')}</div>`:''}`;
}

function lineHtml(l){return `<div class="line"><a class="lt" href="#/product/${l.p.id}">${art(l.p)}</a>
  <div><a href="#/product/${l.p.id}" style="font-weight:500">${esc(l.p.name)}</a><div class="mono">${fmt(l.p.price)}</div>
  <div class="row" style="margin-top:8px"><div class="qty"><button data-act="qty" data-id="${l.p.id}" data-d="-1">−</button><span>${l.qty}</span><button data-act="qty" data-id="${l.p.id}" data-d="1">+</button></div>
  <button class="link" data-act="rm" data-id="${l.p.id}">Remove</button></div></div><div class="price">${fmt(l.p.price*l.qty)}</div></div>`}
function sumHtml(co){const t=totals(co);
  const dl=!t.sub?'—':!co?'Calculated at checkout':S.area==='island'?'To be arranged':(t.sh?fmt(t.sh):'Free');
  return `<div class="sum"><div><span>Subtotal</span><span>${fmt(t.sub)}</span></div>
  <div><span>Delivery</span><span>${dl}</span></div>${CFG.taxRate?`<div><span>Tax</span><span>${fmt(t.tax)}</span></div>`:''}
  <div class="tot"><span>Total</span><span>${fmt(t.total)}</span></div></div>`}
function viewCart(){
  const L=cartLines();
  if(!L.length)return '<h2 class="sec">Shopping cart</h2><div class="empty">Your cart is empty. <a href="#/shop" style="color:var(--accent)">Browse the catalogue</a></div>';
  return `<h2 class="sec">Shopping cart <span class="mono">${L.reduce((s,l)=>s+l.qty,0)} items</span></h2>
  <div class="cols"><div class="panel">${L.map(lineHtml).join('')}</div>
  <div class="panel"><h3 style="margin-top:0">Order summary</h3>${sumHtml()}<p class="mono">Delivery is calculated at checkout.</p><a class="btn block" href="#/checkout">Checkout</a></div></div>`;
}

function fld(name,label,val='',opts={}){return `<div class="field" data-f="${name}"><label>${label}</label><input name="${name}" type="${opts.type||'text'}" value="${esc(val)}" autocomplete="${opts.ac||'on'}" placeholder="${esc(opts.ph||'')}"><div class="em">${opts.err||'Required'}</div></div>`}
function viewCheckout(){
  const L=cartLines();
  if(!L.length)return '<h2 class="sec">Checkout</h2><div class="empty">Your cart is empty. <a href="#/shop" style="color:var(--accent)">Browse the catalogue</a></div>';
  const u=S.user||{},nm=(u.name||'').split(' ');
  return `<h2 class="sec">Checkout <span class="mono">${S.user?'Signed in as '+esc(u.email):'Guest checkout'}</span></h2>
  <div class="cols"><form id="co" class="panel" novalidate>
  <fieldset><legend>Contact</legend>${fld('email','Email',u.email||'',{type:'email',ac:'email',err:'Enter a valid email address'})}
  ${S.user?'':'<p class="mono" style="margin:0">Have an account? <a href="#/account" style="color:var(--accent)">Sign in</a></p>'}</fieldset>
  <fieldset><legend>Delivery</legend>
  <div class="field"><label>Delivery area</label><select name="area"><option value="male" ${S.area==='male'?'selected':''}>Malé</option><option value="island" ${S.area==='island'?'selected':''}>Other island</option></select></div>
  <div class="two">${fld('first','First name',nm[0]||'',{ac:'given-name'})}${fld('last','Last name',nm.slice(1).join(' '),{ac:'family-name'})}</div>
  ${fld('address','Address / house name',u.address||'',{ac:'street-address'})}
  <div id="islandf" class="two" style="display:${S.area==='island'?'grid':'none'}">${fld('island','Island',u.island||'')}${fld('atoll','Atoll',u.atoll||'')}</div>
  ${fld('phone','Phone number (required)',u.phone||'',{type:'tel',ac:'tel',ph:'e.g. 7771234',err:'Enter a valid phone number (at least 7 digits)'})}</fieldset>
  <fieldset><legend>Delivery information</legend><div class="note" style="margin:0">Delivery in Male' free for items price exceeding ${CFG.delivery.maleFreeAbove} MVR. If less than ${CFG.delivery.maleFreeAbove}MVR, a delivery fee of MVR ${CFG.delivery.maleFee} will be charged. Delivery to islands will be arranged through contact with the customer and the store will deliver the item to the requested island boat. Applicable fees will be charged.</div></fieldset>
  <fieldset><legend>Payment</legend>
  <div class="opt"><label><input type="radio" name="pay" value="cod" checked>Cash on delivery / pickup</label></div>
  <div class="opt"><label><input type="radio" name="pay" value="bank">Bank transfer (details sent after order)</label></div>
  <div class="opt dis"><label><input type="radio" name="pay" value="card" disabled>Card payment (gateway not yet connected)</label></div></fieldset>
  ${S.user?'':`<fieldset><label class="chk"><input type="checkbox" name="mk"> Create an account with this order</label>
  <div id="pw" style="display:none;margin-top:10px">${fld('password','Choose a password (min. 6 characters)','',{type:'password',ac:'new-password',err:'Minimum 6 characters'})}</div></fieldset>`}
  <button class="btn block" type="submit">Place order</button></form>
  <div class="panel" style="position:sticky;top:80px"><h3 style="margin-top:0">Order summary</h3>${L.map(l=>`<div class="row" style="justify-content:space-between;padding:6px 0;flex-wrap:nowrap"><span>${esc(l.p.name)} <span class="mono">× ${l.qty}</span></span><span class="price">${fmt(l.p.price*l.qty)}</span></div>`).join('')}
  <div id="cosum" style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px">${sumHtml(true)}</div></div></div>`;
}

const PAY={cod:'Cash on delivery / pickup',bank:'Bank transfer'};
async function viewOrder(id){
  let o=S.lastOrder&&S.lastOrder.id===id?S.lastOrder:null;
  if(!o&&S.user){o=(await db.listOrders()).find(x=>x.id===id)||null}
  if(!o)return '<div class="empty" style="margin-top:30px">Order not found. Guest confirmations are only shown on the device that placed the order; signed-in customers can find their orders under Account.</div>';
  return `<h2 class="sec">Order received <span class="mono">${esc(o.id)}</span></h2><div class="panel" style="max-width:640px">
  <p>Thank you, ${esc(o.customer.first)}. We will contact you on the phone number or email you provided to confirm your order.</p>
  <p class="mono">Phone: ${esc(o.customer.phone||'—')} · Email: ${esc(o.customer.email||'—')}</p>
  ${o.items.map(i=>`<div class="row" style="justify-content:space-between;flex-wrap:nowrap;padding:5px 0"><span>${esc(i.name)} <span class="mono">× ${i.qty}</span></span><span class="price">${fmt(i.price*i.qty)}</span></div>`).join('')}
  <div class="sum" style="border-top:1px solid var(--line);margin-top:8px;padding-top:8px"><div><span>Delivery</span><span>${o.area==='island'?'To be arranged':(o.shipping?fmt(o.shipping):'Free')}</span></div><div class="tot"><span>Total</span><span>${fmt(o.total)}</span></div></div>
  <p class="mono">Status: ${esc(o.status)} · Payment: ${esc(PAY[o.payment]||o.payment)}</p><a class="btn" href="#/shop">Continue shopping</a></div>`;
}
