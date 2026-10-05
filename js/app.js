"use strict";
/* NODEX — chrome, drawer, router, event handlers, form submission and start-up. */
/* ============ CHROME / DRAWER ============ */
function updateChrome(){
  $('#cc').textContent=S.cart.reduce((s,c)=>s+c.qty,0);
  $('#acct').textContent=S.user?(S.user.name||'Account').split(' ')[0]:'Sign in';
  const h=location.hash.split('?')[0];
  $('#mainnav').innerHTML=`<a href="#/" class="${h==='#/'||h===''?'on':''}">Home</a><a href="#/shop" class="${h==='#/shop'?'on':''}">Catalogue</a>${isAdmin()?`<a href="#/admin" class="${h==='#/admin'?'on':''}">Admin</a>`:''}`;
}
function renderDrawer(){
  const L=cartLines();
  $('#drawer').innerHTML=`<div class="dh"><b>Your cart</b><button class="ibtn" data-act="closeall" aria-label="Close">✕</button></div>
  <div class="db">${L.length?L.map(lineHtml).join(''):'<div class="empty" style="margin-top:20px">Cart is empty</div>'}</div>
  <div class="df">${sumHtml().replace(/<div><span>Delivery.*?<\/div>/,'')}<a class="btn block" href="#/cart" data-act="closeall" style="margin-bottom:8px">View cart</a><a class="btn ghost block" href="#/checkout" data-act="closeall">Checkout</a></div>`;
  if(location.hash.startsWith('#/cart')||location.hash.startsWith('#/checkout'))render(true);
}
function openDrawer(){renderDrawer();$('#drawer').classList.add('open');$('#ov').classList.add('open')}
function closeAll(){$('#drawer').classList.remove('open');$('#ov').classList.remove('open');$('#modal').classList.remove('open')}

/* ============ ROUTER ============ */
async function render(keepScroll){
  try{await render0(keepScroll)}catch(e){$('#app').innerHTML=`<div class="empty" style="margin-top:30px">${esc(e.message||'Something went wrong')}</div>`}
}
async function render0(keepScroll){
  const h=location.hash.slice(1)||'/',[path,qs]=h.split('?'),pt=path.split('/').filter(Boolean),k=pt[0]||'home';
  let html='';
  if(k==='home')html=viewHome();else if(k==='shop')html=viewShop();else if(k==='product')html=viewProduct(pt[1]);
  else if(k==='cart')html=viewCart();else if(k==='checkout')html=viewCheckout();else if(k==='order')html=await viewOrder(pt[1]);
  else if(k==='account')html=await viewAccount();else if(k==='admin')html=await viewAdmin();
  else html='<div class="empty" style="margin-top:30px">Page not found.</div>';
  const y=window.scrollY;
  $('#app').innerHTML=html;
  const sel=$('select[data-in=sort]');if(sel)sel.value=S.filter.sort;
  initHero();
  initGallery();
  updateChrome();
  if(!keepScroll)window.scrollTo(0,0);else window.scrollTo(0,y);
}
window.addEventListener('hashchange',()=>{S.pdQty=1;S.confirmDel=null;render()});

/* ============ EVENTS ============ */
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  const a=el.dataset.act,id=el.dataset.id;
  if(a==='add'){const n=el.dataset.q==='pd'?S.pdQty:1;addToCart(id,n)}
  else if(a==='drawer')openDrawer();
  else if(a==='closeall')closeAll();
  else if(a==='theme'){const r=document.documentElement,dark=getComputedStyle(r).getPropertyValue('--bg').trim()==='#070b12';r.dataset.theme=dark?'light':'dark'}
  else if(a==='cat'){S.filter.cat=el.dataset.v;if(el.dataset.go){location.hash='#/shop'}else refreshGrid()}
  else if(a==='pdq'){const p=getP(location.hash.split('/')[2]);S.pdQty=Math.max(1,Math.min(p?Math.max(1,p.stock):1,S.pdQty+ +el.dataset.d));render(true)}
  else if(a==='qty'){const c=S.cart.find(x=>x.id===id);setQty(id,(c?c.qty:0)+ +el.dataset.d);if(!location.hash.startsWith('#/cart')&&!location.hash.startsWith('#/checkout'))render(true)}
  else if(a==='rm'){setQty(id,0)}
  else if(a==='atab'){S.acctTab=el.dataset.v;render(true)}
  else if(a==='signout'){await auth.signOut();S.user=null;updateChrome();render()}
  else if(a==='resetdemo'){if(window.confirm('Reset all demo data (products, orders, accounts and cart) to the starting state?'))demoBackend.reset()}
  else if(a==='admtab'){S.adminTab=el.dataset.v;render(true)}
  else if(a==='pform'){productForm(id)}
  else if(a==='imgl')pfMove(+el.dataset.i,-1);
  else if(a==='imgr')pfMove(+el.dataset.i,1);
  else if(a==='imgx')pfRemove(+el.dataset.i);
  else if(a==='del'){
    if(S.confirmDel===id){try{await db.deleteProduct(id);S.cart=S.cart.filter(c=>c.id!==id);saveCart();S.products=await db.listProducts();toast('Product deleted')}catch(err){toast(err.message)}S.confirmDel=null}
    else S.confirmDel=id;
    render(true);
  }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
document.addEventListener('input',e=>{
  const t=e.target,k=t.dataset.in;
  if(k==='q'){S.filter.q=t.value;refreshGrid()}
});
document.addEventListener('change',async e=>{
  const t=e.target,k=t.dataset.in;
  if(k==='sort'){S.filter.sort=t.value;refreshGrid()}
  else if(k==='stock'){S.filter.inStock=t.checked;refreshGrid()}
  else if(t.name==='area'){S.area=t.value;$('#islandf').style.display=t.value==='island'?'grid':'none';$('#cosum').innerHTML=sumHtml(true)}
  else if(t.name==='mk'){$('#pw').style.display=t.checked?'block':'none'}
  else if(t.id==='imgfile'){const fl=[...t.files];t.value='';await pfAdd(fl)}
  else if(t.dataset.quick&&isAdmin()){
    const p={...getP(t.dataset.id)},v=Number(t.value),key=t.dataset.quick;
    if(!Number.isFinite(v)||v<0||(key==='stock'&&!Number.isInteger(v))){toast('Invalid value');return render(true)}
    p[key]=v;
    try{await db.saveProduct(p);S.products=await db.listProducts();toast('Updated')}catch(err){toast(err.message);S.products=await db.listProducts();render(true)}
  }
  else if(t.dataset.ostat&&isAdmin()){
    try{await db.updateOrderStatus(t.dataset.ostat,t.value);if(t.value==='Cancelled')S.products=await db.listProducts();toast(t.value==='Cancelled'?'Order cancelled; stock restored':'Order status updated')}
    catch(err){toast(err.message)}
    render(true);
  }
});
function validate(form,rules){
  let ok=true;
  for(const [n,fn] of Object.entries(rules)){
    const f=form.querySelector(`[data-f="${n}"]`),v=(form.elements[n]?.value||'').trim(),good=fn(v);
    if(f)f.classList.toggle('err',!good);if(!good)ok=false;
  }
  return ok;
}
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), req=v=>v.length>0;
const phoneOk=v=>v.replace(/\D/g,'').length>=7&&v.length<=30;
async function handleSubmit(f){
  // NB: use getAttribute, not f.id. The product form has an input named "id", and browsers then return that input from f.id.
  const fid=f.getAttribute('id');
  if(fid==='co'){
    const mk=f.elements.mk&&f.elements.mk.checked;
    const isl=f.elements.area.value==='island';
    const rules={email:emailOk,first:req,last:req,phone:phoneOk};
    if(isl){rules.island=req;rules.atoll=req}else rules.address=req;
    if(mk)rules.password=v=>v.length>=6;
    if(!validate(f,rules)){const bad=f.querySelector('.err');if(bad)bad.scrollIntoView({block:'center'});return}
    const fd=Object.fromEntries(new FormData(f));S.area=fd.area;
    const customer={email:fd.email.trim(),first:fd.first.trim(),last:fd.last.trim(),phone:fd.phone.trim(),address:(fd.address||'').trim(),island:(fd.island||'').trim(),atoll:(fd.atoll||'').trim()};
    let pendingConfirm=false;
    if(mk&&!S.user){
      const r=await auth.signUp(customer.email,fd.password,customer.first+' '+customer.last,customer.phone);
      if(r.user){S.user=r.user;updateChrome();await auth.updateProfile({phone:customer.phone,address:customer.address,island:customer.island,atoll:customer.atoll})}
      else pendingConfirm=r.needsConfirmation;
    }
    const res=await db.placeOrder(cartLines().map(l=>({id:l.p.id,qty:l.qty})),customer,fd.area,fd.pay);
    res.customer={...customer,...res.customer};
    S.lastOrder=res;try{sessionStorage.setItem('nx_last',JSON.stringify(res))}catch(e){}
    S.cart=[];saveCart();renderDrawer();
    try{S.products=await db.listProducts()}catch(e){}
    if(pendingConfirm)toast('Order placed. Check your email to confirm your new account.');
    location.hash='#/order/'+res.id;
  }
  else if(fid==='auth'){
    const reg=S.acctTab==='up',rules={email:emailOk,password:v=>v.length>=6};if(reg){rules.name=req;rules.phone=phoneOk}
    if(!validate(f,rules))return;
    const email=f.elements.email.value.trim(),password=f.elements.password.value;
    if(reg){
      const r=await auth.signUp(email,password,f.elements.name.value.trim(),f.elements.phone.value.trim());
      if(r.user){S.user=r.user;updateChrome();toast('Account created');location.hash='#/account';render()}
      else toast('Check your email to confirm your account, then sign in.');
    }else{
      S.user=await auth.signIn(email,password);
      updateChrome();toast('Signed in');location.hash=isAdmin()?'#/admin':'#/account';render();
    }
  }
  else if(fid==='pf'){
    const fd=Object.fromEntries(new FormData(f));
    if(!validate(f,{name:req,category:req,price:v=>v!==''&&Number.isFinite(+v)&&+v>=0,stock:v=>v!==''&&Number.isInteger(+v)&&+v>=0}))return;
    const specs=fd.specs.split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const i=l.indexOf(':');return i<0?[l,'']:[l.slice(0,i).trim(),l.slice(i+1).trim()]});
    const hue=Math.min(360,Math.max(0,Math.round(Number(fd.hue))));
    const uploaded=[],urls=[];
    if(PF.items.some(it=>it.blob))toast('Saving images…');
    try{
      for(const it of PF.items){if(it.blob){const u=await db.uploadImage(it.blob);uploaded.push(u);urls.push(u)}else urls.push(it.url)}
      await db.saveProduct({id:fd.id||null,sku:(fd.sku||'').trim(),name:fd.name.trim(),category:fd.category.trim(),price:Number(fd.price),stock:Number(fd.stock),description:fd.description.trim(),specs,featured:!!fd.featured,hue:Number.isFinite(hue)?hue:200,images:urls});
    }catch(err){
      if(uploaded.length)try{await db.deleteImages(uploaded)}catch(e){}   // do not leave orphaned files behind
      throw err;
    }
    const removed=PF.orig.filter(u=>!urls.includes(u));
    if(removed.length)try{await db.deleteImages(removed)}catch(e){}
    S.products=await db.listProducts();
    closeAll();toast('Product saved');render(true);
  }
  else if(fid==='sf'){
    if(!validate(f,{free:v=>v!==''&&+v>=0,fee:v=>v!==''&&+v>=0,tax:v=>v!==''&&+v>=0&&+v<=1}))return;
    const v={free:+f.elements.free.value,fee:+f.elements.fee.value,tax:+f.elements.tax.value};
    await db.saveSettings({delivery_male_free_above:v.free,delivery_male_fee:v.fee,tax_rate:v.tax});
    CFG.delivery.maleFreeAbove=v.free;CFG.delivery.maleFee=v.fee;CFG.taxRate=v.tax;
    toast('Settings saved');render(true);
  }
}
document.addEventListener('submit',async e=>{
  e.preventDefault();const f=e.target,btn=f.querySelector('button[type=submit]');
  if(btn)btn.disabled=true;
  try{await handleSubmit(f)}catch(err){toast(err.message||'Something went wrong')}
  finally{if(btn)btn.disabled=false}
});

/* ============ BOOT ============ */
function setupScreen(msg){
  $('#app').innerHTML=`<h2 class="sec">Setup required</h2><div class="panel" style="max-width:640px"><p>${esc(msg)}</p>
  <ol><li>Create a project at supabase.com and run <b>sql/schema.sql</b> in its SQL Editor.</li><li>Copy the project URL and the anon / publishable key (Project Settings &gt; API) into <b>js/config.js</b>.</li><li>Set <b>mode</b> to 'supabase' in that file (or 'demo' to run without a database), then reload.</li></ol></div>`;
  updateChrome();
}
(async()=>{
  if(CFG.mode==='demo'){const b=$('#demobar');if(b)b.hidden=false}
  const init=await BACKEND.init();
  if(init.error)return setupScreen(init.error);
  try{
    try{const st=await db.settings();
      if(st.delivery_male_free_above!=null)CFG.delivery.maleFreeAbove=st.delivery_male_free_above;
      if(st.delivery_male_fee!=null)CFG.delivery.maleFee=st.delivery_male_fee;
      if(st.tax_rate!=null)CFG.taxRate=st.tax_rate}catch(e){}
    S.products=await db.listProducts();
    S.user=await auth.current();
  }catch(err){return setupScreen('Could not reach the database: '+err.message)}
  auth.onChange(async()=>{
    const prev=S.user?S.user.id:null;S.user=await auth.current();
    if((S.user?S.user.id:null)!==prev){updateChrome();render(true)}
  });
  updateChrome();renderDrawer();render();
})();
